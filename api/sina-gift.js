// Staff-only complimentary-adoption endpoint. The browser never receives a
// Shopify credential; it supplies the existing Sina admin key only to this
// endpoint, which validates it before it can create an order.

const { isSinaGiftKeyValid } = require('../lib/sina-config.js');
const { shopifyGraphql, shopifyDomain } = require('../lib/shopify.js');

const HIGHLEVEL_UPSERT_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
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

async function createArmsGiftContact({ recipientName, recipientEmail, title, sku }) {
  const token = highLevelToken();
  if (!token) throw new Error('ARMS contact credentials are not configured. The gift was not completed.');
  const { firstName, lastName } = splitName(recipientName);
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
      email: recipientEmail,
      source: "Sina's Creations — Sina Gift",
      // Kept separate from the fulfillment tag: this creates the recipient
      // now, while the normal adoption follow-up remains tied to fulfillment.
      tags: ['Sina Gift'],
      // HighLevel's upsert endpoint does not support a first-class note in
      // the same request, so the essential piece details travel in the source
      // and tags until the fulfillment webhook adds the certificate links.
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(result.message) ? result.message.join(' ') : result.message;
    throw new Error(detail || `ARMS rejected the new recipient contact (${response.status}).`);
  }
  return (result.contact && result.contact.id) || result.id || null;
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

async function createGiftDraft({ variant, recipientName, notificationEmail, recipientEmail }) {
  const recipientAttributes = [
    { key: 'Certificate recipient name', value: recipientName },
    { key: 'Gift source', value: 'Sina Gift' },
  ];
  if (recipientEmail) recipientAttributes.push({ key: 'Gift recipient email', value: recipientEmail });
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
        email: notificationEmail || recipientEmail,
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
  const recipientName = cleanText(body.recipientName);
  const notificationEmail = body.notificationEmail ? cleanEmail(body.notificationEmail) : '';
  const recipientEmail = cleanEmail(body.recipientEmail);

  if (!sku) return sendJson(res, 400, { error: 'Choose a valid SKU.' });
  if (!recipientName) return sendJson(res, 400, { error: 'Enter the certificate recipient name.' });
  if (body.notificationEmail && !notificationEmail) return sendJson(res, 400, { error: 'Enter a valid internal notification email or leave it blank.' });
  if (!recipientEmail) return sendJson(res, 400, { error: 'Enter the recipient email so ARMS can create their contact.' });

  try {
    const variant = await findAvailableVariant(sku);
    if (!variant || variant.inventoryQuantity <= 0 || !variant.availableForSale) {
      return sendJson(res, 409, { error: 'That piece is no longer available to gift.' });
    }

    // The order remains an unpaid draft at this point. If ARMS rejects the
    // contact, no gift is completed and no one-of-one inventory is consumed.
    const draft = await createGiftDraft({ variant, recipientName, notificationEmail, recipientEmail });
    const armsContactId = await createArmsGiftContact({
      recipientName,
      recipientEmail,
      title: variant.product && variant.product.title ? variant.product.title : sku,
      sku,
    });
    const order = await completeGiftDraft(draft.id);
    const domain = shopifyDomain();
    const adminUrl = domain && order.id ? `https://${domain}/admin/orders/${numericId(order.id)}` : null;

    return sendJson(res, 201, {
      ok: true,
      orderName: order.name,
      pieceTitle: variant.product && variant.product.title ? variant.product.title : sku,
      recipientName,
      armsContactId,
      adminUrl,
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to create the Sina Gift.' });
  }
}
