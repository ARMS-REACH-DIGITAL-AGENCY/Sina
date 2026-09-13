// Staff-only complimentary-adoption endpoint. The browser never receives a
// Shopify credential; it supplies the existing Sina admin key only to this
// endpoint, which validates it before it can create an order.

const { isSinaGiftKeyValid } = require('../lib/sina-config.js');
const { shopifyGraphql, shopifyDomain } = require('../lib/shopify.js');
const { signAdoption } = require('../lib/adoption-token.js');

const HIGHLEVEL_UPSERT_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
const HIGHLEVEL_NOTES_URL = 'https://services.leadconnectorhq.com/contacts';
const HIGHLEVEL_VERSION = '2021-07-28';

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cleanText(value, maxLength = 160) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function cleanSku(value) {
  const sku = cleanText(value, 80).toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]*$/.test(sku) ? sku : '';
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  // This intentionally only catches obvious typos. Shopify is the final
  // authority for mailbox validity, and stricter regexes reject valid mail.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function cleanPhone(value) {
  const phone = cleanText(value, 40);
  return /^[0-9+().\-\s]{7,40}$/.test(phone) ? phone : '';
}

function siteOrigin() {
  return (process.env.SITE_ORIGIN || 'https://www.sinascreations.com').replace(/\/+$/, '');
}

function mutationErrors(result, mutationName) {
  const errors = result && result[mutationName] && result[mutationName].userErrors;
  if (!errors || !errors.length) return null;
  return errors.map((item) => item.message).filter(Boolean).join('; ') || 'Shopify rejected the request.';
}

function numericId(gid) {
  return String(gid || '').split('/').pop();
}

function splitName(name) {
  const parts = cleanText(name).split(' ').filter(Boolean);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

function highLevelToken() {
  const value = process.env.HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN
    || process.env.HIGHLEVEL_SUBACCOUNT_TOKEN;
  const locationId = process.env.HIGHLEVEL_LOCATION_ID
    || process.env.HIGHLEVEL_DEFAULT_LOCATION_ID;
  return value && locationId ? { value, locationId } : null;
}

function buildGiftLinks({ sku, recipientName }) {
  const token = signAdoption({ sku, adopter: recipientName });
  const origin = siteOrigin();
  return {
    certificateUrl: `${origin}/api/certificate?t=${encodeURIComponent(token)}`,
    uploadUrl: `${origin}/u/${encodeURIComponent(token)}`,
  };
}

async function addArmsNote(contactId, body, token) {
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

async function createArmsGiftContact({ recipientName, recipientEmail, recipientPhone, title, sku, links }) {
  const token = highLevelToken();
  if (!token) throw new Error('ARMS contact credentials are not configured. The gift was not completed.');
  const { firstName, lastName } = splitName(recipientName);
  const contactPending = !recipientEmail && !recipientPhone;
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
      firstName,
      lastName: lastName || undefined,
      name: recipientName,
      email: recipientEmail || undefined,
      phone: recipientPhone || undefined,
      source: "Sina's Creations — Sina Gift",
      // Kept separate from the fulfillment tag: this creates the recipient
      // now, while the normal adoption follow-up remains tied to fulfillment.
      tags: contactPending ? ['Sina Gift', 'Contact Info Needed'] : ['Sina Gift'],
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(result.message) ? result.message.join(' ') : result.message;
    throw new Error(detail || `ARMS rejected the new recipient contact (${response.status}).`);
  }
  const contactId = (result.contact && result.contact.id) || result.id || null;
  if (!contactId) throw new Error('ARMS created the contact but did not return its ID. The gift was not completed.');

  const noteStored = await addArmsNote(contactId, [
    `Sina Gift record${contactPending ? ' — contact information needed' : ''}`,
    '',
    `${title} (${sku})`,
    `Certificate: ${links.certificateUrl}`,
    `Photo upload: ${links.uploadUrl}`,
  ].join('\n'), token);
  if (!noteStored) throw new Error('ARMS created the contact but could not save the certificate links. The gift was not completed.');
  return contactId;
}

async function findAvailableVariant(sku) {
  const data = await shopifyGraphql(
    `query($query: String!) {
      productVariants(first: 5, query: $query) {
        edges {
          node {
            id
            sku
            availableForSale
            inventoryQuantity
            product { title }
          }
        }
      }
    }`,
    { query: `sku:${sku}` },
  );

  const variants = data && data.productVariants && data.productVariants.edges
    ? data.productVariants.edges.map((edge) => edge.node).filter(Boolean)
    : [];
  return variants.find((variant) => String(variant.sku || '').trim().toUpperCase() === sku) || null;
}

// A deliberate staff action for a real gift-flow test. The normal catalog
// cron never restores sold inventory from the Sheet automatically: a stale
// "1" could otherwise re-list a piece that has already found a home. This
// route is protected by the Sina Gift passcode and only changes the selected
// variant's on-hand quantity; it does not touch product text, price, or any
// other catalog row.
async function restockForGiftTest(sku) {
  const data = await shopifyGraphql(
    `query($query: String!) {
      productVariants(first: 5, query: $query) {
        edges { node { sku inventoryItem { id } product { title } } }
      }
      locations(first: 1) { edges { node { id } } }
    }`,
    { query: `sku:${sku}` },
  );
  const variant = (data.productVariants && data.productVariants.edges || [])
    .map((edge) => edge.node)
    .find((node) => String(node && node.sku || '').trim().toUpperCase() === sku);
  const locationId = data.locations && data.locations.edges && data.locations.edges[0]
    && data.locations.edges[0].node && data.locations.edges[0].node.id;
  if (!variant || !variant.inventoryItem || !locationId) throw new Error('Shopify could not find the piece or inventory location.');

  const result = await shopifyGraphql(
    `mutation($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) { userErrors { field message } }
    }`,
    { input: { reason: 'correction', setQuantities: [{ inventoryItemId: variant.inventoryItem.id, locationId, quantity: 1 }] } },
  );
  const errors = result.inventorySetOnHandQuantities && result.inventorySetOnHandQuantities.userErrors;
  if (errors && errors.length) throw new Error(errors.map((error) => error.message).join('; '));
  return { sku, title: variant.product && variant.product.title ? variant.product.title : sku };
}

async function createGiftDraft({ variant, recipientName, notificationEmail, recipientEmail, recipientPhone }) {
  const recipientAttributes = [
    { key: 'Certificate recipient name', value: recipientName },
    { key: 'Gift source', value: 'Sina Gift' },
  ];
  if (recipientEmail) recipientAttributes.push({ key: 'Gift recipient email', value: recipientEmail });
  if (recipientPhone) recipientAttributes.push({ key: 'Gift recipient phone', value: recipientPhone });
  if (notificationEmail) recipientAttributes.push({ key: 'Internal notification email', value: notificationEmail });

  const data = await shopifyGraphql(
    `mutation($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          totalPriceSet { shopMoney { amount currencyCode } }
        }
        userErrors { field message }
      }
    }`,
    {
      input: {
        // Shopify needs an order email for its own receipt/record. When Sina
        // wants a staff copy, it stays with staff; otherwise the recipient is
        // used. ARMS always uses the recipient email below.
        email: notificationEmail || recipientEmail || undefined,
        taxExempt: true,
        tags: ['Sina Gift', 'Adopted a Creation'],
        note: `Sina Gift — certificate recipient: ${recipientName}`,
        customAttributes: recipientAttributes,
        // This is a deliberate internal draft-order discount, not a customer
        // checkout. It produces the same $0 result as SINAGIFT while avoiding
        // the payment-information prompt entirely.
        appliedDiscount: {
          title: 'SINAGIFT',
          description: 'Complimentary Sina Gift adoption',
          value: 100,
          valueType: 'PERCENTAGE',
        },
        lineItems: [{
          variantId: variant.id,
          quantity: 1,
          customAttributes: recipientAttributes,
        }],
      },
    },
  );

  const error = mutationErrors(data, 'draftOrderCreate');
  if (error) throw new Error(error);
  const draft = data && data.draftOrderCreate && data.draftOrderCreate.draftOrder;
  if (!draft) throw new Error('Shopify did not return the new draft order.');

  // Do not mark anything paid unless the calculated total is actually zero.
  // This is the guard against a changed tax/discount configuration creating a
  // surprise charge or a full-price internal order.
  const total = Number(draft.totalPriceSet && draft.totalPriceSet.shopMoney && draft.totalPriceSet.shopMoney.amount);
  if (!Number.isFinite(total) || Math.abs(total) > 0.00001) {
    throw new Error('The Sina Gift draft did not total $0. It was left as a draft and was not marked paid.');
  }
  return draft;
}

async function completeGiftDraft(draftId) {
  const data = await shopifyGraphql(
    `mutation($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder {
          order { id name displayFinancialStatus }
        }
        userErrors { field message }
      }
    }`,
    { id: draftId },
  );
  const error = mutationErrors(data, 'draftOrderComplete');
  if (error) throw new Error(error);
  const order = data && data.draftOrderComplete && data.draftOrderComplete.draftOrder
    && data.draftOrderComplete.draftOrder.order;
  if (!order) throw new Error('Shopify did not return the completed order.');
  return order;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const suppliedKey = req.headers['x-admin-key'];
  if (!isSinaGiftKeyValid(suppliedKey)) return sendJson(res, 401, { error: 'The Sina Gift passcode is not valid.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sku = cleanSku(body.sku);

  if (body.action === 'restock-test') {
    if (!sku) return sendJson(res, 400, { error: 'Choose a valid SKU.' });
    try {
      const restocked = await restockForGiftTest(sku);
      return sendJson(res, 200, { ok: true, restocked });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || 'Unable to restock this test piece.' });
    }
  }

  const recipientName = cleanText(body.recipientName);
  const notificationEmail = body.notificationEmail ? cleanEmail(body.notificationEmail) : '';
  const recipientEmail = body.recipientEmail ? cleanEmail(body.recipientEmail) : '';
  const recipientPhone = body.recipientPhone ? cleanPhone(body.recipientPhone) : '';

  if (!sku) return sendJson(res, 400, { error: 'Choose a valid SKU.' });
  if (!recipientName) return sendJson(res, 400, { error: 'Enter the certificate recipient name.' });
  if (body.notificationEmail && !notificationEmail) return sendJson(res, 400, { error: 'Enter a valid internal notification email or leave it blank.' });
  if (body.recipientEmail && !recipientEmail) return sendJson(res, 400, { error: 'Enter a valid recipient email or leave it blank.' });
  if (body.recipientPhone && !recipientPhone) return sendJson(res, 400, { error: 'Enter a valid recipient phone number or leave it blank.' });

  try {
    const variant = await findAvailableVariant(sku);
    if (!variant || variant.inventoryQuantity <= 0 || !variant.availableForSale) {
      return sendJson(res, 409, { error: 'That piece is no longer available to gift.' });
    }

    const pieceTitle = variant.product && variant.product.title ? variant.product.title : sku;
    const links = buildGiftLinks({ sku, recipientName });
    // The draft is deliberately not completed yet. If ARMS rejects the
    // contact/note, no gift is completed and no one-of-one inventory is used.
    const draft = await createGiftDraft({ recipientName, notificationEmail, recipientEmail, recipientPhone, variant });
    // A name-only recipient is intentionally allowed. ARMS records it as a
    // provisional individual contact instead of attaching every gift to a
    // shared account or inventing an email address.
    const armsContactId = await createArmsGiftContact({
      recipientName,
      recipientEmail,
      recipientPhone,
      title: pieceTitle,
      sku,
      links,
    });
    const order = await completeGiftDraft(draft.id);
    const domain = shopifyDomain();
    const adminUrl = domain && order.id ? `https://${domain}/admin/orders/${numericId(order.id)}` : null;

    return sendJson(res, 201, {
      ok: true,
      orderName: order.name,
      pieceTitle,
      recipientName,
      armsContactId,
      adminUrl,
      certificateUrl: links.certificateUrl,
      uploadUrl: links.uploadUrl,
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to create the Sina Gift.' });
  }
}
