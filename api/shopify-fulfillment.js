// Shopify fulfillment webhook -- the automatic half of adoption follow-up.
//
// Subscribe this to the `fulfillments/create` topic. When Sina marks a piece as
// shipped, this records the adoption in HighLevel with links to the adopter's
// certificate and their photo-upload page, and tags the contact so a workflow
// can send the email.
//
// This is only half the trigger. Pieces sell at craft fairs and hand to hand
// with no Shopify order behind them, and those adoptions have to be entered by
// hand -- see the SKU-keyed /api/certificate. Anything built to assume a
// fulfillment exists would quietly skip them.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { shopifyGraphql } from '../lib/shopify.js';
import { signAdoption } from '../lib/adoption-token.js';

const HIGHLEVEL_UPSERT_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
const HIGHLEVEL_NOTES_URL = 'https://services.leadconnectorhq.com/contacts';
const HIGHLEVEL_VERSION = '2021-07-28';

// Vercel parses JSON bodies by default, and a re-serialized body will not
// byte-match what Shopify signed. HMAC has to be computed over the exact bytes
// received, so body parsing is turned off and the stream is read directly.
export const config = { api: { bodyParser: false } };

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Which secret signs a Shopify webhook depends on how it was created. One
// registered through the Admin API is signed with the app's client secret,
// which this project already has for the OAuth token exchange. One created by
// hand in Settings > Notifications gets its own signing secret instead. Both
// are accepted so registering either way works without a config change.
function hmacMatches(rawBody, headerValue) {
  if (!headerValue) return false;
  const provided = Buffer.from(String(headerValue));

  const secrets = [process.env.SHOPIFY_WEBHOOK_SECRET, process.env.SHOPIFY_CLIENT_SECRET]
    .filter(Boolean);

  return secrets.some((secret) => {
    const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('base64'));
    // timingSafeEqual throws on a length mismatch rather than returning false.
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  });
}

function siteOrigin() {
  return (process.env.SITE_ORIGIN || 'https://www.sinascreations.com').replace(/\/+$/, '');
}

// One tag per fulfillment rather than a single "processed" flag on the order:
// an order can be fulfilled in more than one shipment, and a blanket flag would
// silently drop every piece after the first.
function fulfillmentTag(fulfillmentId) {
  return `adopted-f${fulfillmentId}`;
}

async function fetchOrder(orderId) {
  const data = await shopifyGraphql(
    `query($id: ID!) {
      order(id: $id) {
        id
        name
        tags
        email
        customer { firstName lastName email }
        shippingAddress { firstName lastName }
      }
    }`,
    { id: `gid://shopify/Order/${orderId}` },
  );
  return data && data.order;
}

async function tagOrder(orderGid, tag) {
  const data = await shopifyGraphql(
    `mutation($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) { userErrors { message } }
    }`,
    { id: orderGid, tags: [tag] },
  );
  const errors = data && data.tagsAdd && data.tagsAdd.userErrors;
  if (errors && errors.length) throw new Error(errors.map((e) => e.message).join('; '));
}

function splitName(order) {
  const customer = order.customer || {};
  const shipping = order.shippingAddress || {};
  const firstName = customer.firstName || shipping.firstName || '';
  const lastName = customer.lastName || shipping.lastName || '';
  return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' ') };
}

// Mirrors api/highlevel/contact.js: a custom field is only sent when its id has
// been configured. HighLevel custom fields do not exist in Sina's sub-account
// yet, so today every one of these is skipped and the note below carries the
// detail instead. Setting the env vars later upgrades this with no code change.
function appendCustomField(fields, envName, value) {
  const id = process.env[envName];
  if (id && value) fields.push({ id, value: String(value) });
}

function buildAdoptions(lineItems, adopterName) {
  return lineItems
    .filter((item) => item && item.sku)
    .map((item) => {
      const token = signAdoption({ sku: item.sku, adopter: adopterName });
      return {
        sku: item.sku,
        title: item.title || item.name || item.sku,
        certificateUrl: `${siteOrigin()}/api/certificate?t=${encodeURIComponent(token)}`,
        uploadUrl: `${siteOrigin()}/u/${encodeURIComponent(token)}`,
      };
    });
}

function buildNote(order, adoptions) {
  const lines = [
    `Adoption confirmed — Shopify order ${order.name}`,
    '',
  ];
  for (const adoption of adoptions) {
    lines.push(
      `${adoption.title} (${adoption.sku})`,
      `  Certificate: ${adoption.certificateUrl}`,
      `  Upload a photo: ${adoption.uploadUrl}`,
      '',
    );
  }
  return lines.join('\n').trim();
}

async function upsertContact({ order, adoptions, email, token }) {
  const { firstName, lastName, fullName } = splitName(order);
  const primary = adoptions[0];

  const customFields = [];
  appendCustomField(customFields, 'HIGHLEVEL_ADOPTED_PIECE_FIELD_ID', primary.title);
  appendCustomField(customFields, 'HIGHLEVEL_ADOPTED_SKU_FIELD_ID', primary.sku);
  appendCustomField(customFields, 'HIGHLEVEL_CERTIFICATE_URL_FIELD_ID', primary.certificateUrl);
  appendCustomField(customFields, 'HIGHLEVEL_UPLOAD_URL_FIELD_ID', primary.uploadUrl);

  const response = await fetch(HIGHLEVEL_UPSERT_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token.value}`,
      'Content-Type': 'application/json',
      Version: HIGHLEVEL_VERSION,
    },
    body: JSON.stringify({
      locationId: token.locationId,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      name: fullName || undefined,
      email,
      source: "Sina's Creations — Adoption",
      // The tag is the handle a HighLevel workflow triggers on. Renaming it
      // means rebuilding the workflow trigger, so treat it as an interface.
      tags: ['Sina Website', 'Adopted a Creation'],
      customFields: customFields.length ? customFields : undefined,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(result.message) ? result.message.join(' ') : result.message;
    throw new Error(detail || `HighLevel rejected the contact (${response.status})`);
  }
  return (result.contact && result.contact.id) || result.id || null;
}

async function addNote(contactId, body, token) {
  const response = await fetch(`${HIGHLEVEL_NOTES_URL}/${contactId}/notes`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token.value}`,
      'Content-Type': 'application/json',
      Version: HIGHLEVEL_VERSION,
    },
    body: JSON.stringify({ body }),
  });
  return response.ok;
}

function highLevelToken() {
  const value = process.env.HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN
    || process.env.HIGHLEVEL_SUBACCOUNT_TOKEN;
  const locationId = process.env.HIGHLEVEL_LOCATION_ID
    || process.env.HIGHLEVEL_DEFAULT_LOCATION_ID;
  if (!value || !locationId) return null;
  return { value, locationId };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const rawBody = await readRawBody(req);
  if (!hmacMatches(rawBody, req.headers['x-shopify-hmac-sha256'])) {
    // This endpoint is public, so an unverified caller gets nothing back that
    // would help them work out what it does.
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (error) {
    // Malformed and signed by us is not something a retry will fix.
    return sendJson(res, 200, { ok: false, reason: 'unparseable body' });
  }

  const fulfillmentId = payload.id;
  const orderId = payload.order_id;
  const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

  if (!orderId || !fulfillmentId) {
    return sendJson(res, 200, { ok: false, reason: 'not a fulfillment payload' });
  }

  try {
    const order = await fetchOrder(orderId);
    if (!order) return sendJson(res, 200, { ok: false, reason: `order ${orderId} not found` });

    const tag = fulfillmentTag(fulfillmentId);
    if ((order.tags || []).includes(tag)) {
      // Shopify retries a webhook for up to 48 hours, and a retry after a
      // successful run must not email the adopter a second time.
      return sendJson(res, 200, { ok: true, skipped: 'already processed' });
    }

    const email = (order.customer && order.customer.email) || order.email || '';
    if (!email) {
      // Nothing to send to. Tagging would hide the problem, so leave the order
      // untagged and report it -- it can be handled by hand.
      return sendJson(res, 200, { ok: false, reason: 'order has no email address' });
    }

    const { fullName } = splitName(order);
    const adoptions = buildAdoptions(lineItems, fullName || 'A new owner');
    if (!adoptions.length) {
      return sendJson(res, 200, { ok: false, reason: 'no line items with a SKU' });
    }

    const token = highLevelToken();
    if (!token) throw new Error('HighLevel credentials are not configured');

    const contactId = await upsertContact({ order, adoptions, email, token });
    let noteStored = false;
    if (contactId) {
      noteStored = await addNote(contactId, buildNote(order, adoptions), token);
    }

    // Tag last. If anything above threw, the order stays untagged and Shopify's
    // retry gets a real second attempt rather than hitting the skip path.
    await tagOrder(order.id, tag);

    return sendJson(res, 200, {
      ok: true,
      order: order.name,
      contactId,
      noteStored,
      pieces: adoptions.map((a) => a.sku),
    });
  } catch (error) {
    // 5xx so Shopify retries -- a HighLevel outage or a missing env var is
    // worth another attempt inside the retry window.
    return sendJson(res, 500, { error: error.message });
  }
}

export { buildAdoptions, buildNote, fulfillmentTag, hmacMatches };
