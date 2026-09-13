// Staff-only complimentary-adoption endpoint. The browser never receives a
// Shopify credential; it supplies the existing Sina admin key only to this
// endpoint, which validates it before it can create an order.

const { isAdminKeyValid } = require('../lib/sina-config.js');
const { shopifyGraphql, shopifyDomain } = require('../lib/shopify.js');

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
        email: notificationEmail,
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
  if (!isAdminKeyValid(suppliedKey)) return sendJson(res, 401, { error: 'The access key is not valid.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sku = cleanSku(body.sku);
  const recipientName = cleanText(body.recipientName);
  const notificationEmail = cleanEmail(body.notificationEmail);
  const recipientEmail = body.recipientEmail ? cleanEmail(body.recipientEmail) : '';

  if (!sku) return sendJson(res, 400, { error: 'Choose a valid SKU.' });
  if (!recipientName) return sendJson(res, 400, { error: 'Enter the certificate recipient name.' });
  if (!notificationEmail) return sendJson(res, 400, { error: 'Enter a valid internal notification email.' });
  if (body.recipientEmail && !recipientEmail) return sendJson(res, 400, { error: 'Enter a valid recipient email or leave it blank.' });

  try {
    const variant = await findAvailableVariant(sku);
    if (!variant || variant.inventoryQuantity <= 0 || !variant.availableForSale) {
      return sendJson(res, 409, { error: 'That piece is no longer available to gift.' });
    }

    const draft = await createGiftDraft({ variant, recipientName, notificationEmail, recipientEmail });
    const order = await completeGiftDraft(draft.id);
    const domain = shopifyDomain();
    const adminUrl = domain && order.id ? `https://${domain}/admin/orders/${numericId(order.id)}` : null;

    return sendJson(res, 201, {
      ok: true,
      orderName: order.name,
      pieceTitle: variant.product && variant.product.title ? variant.product.title : sku,
      recipientName,
      adminUrl,
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to create the Sina Gift.' });
  }
}
