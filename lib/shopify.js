// Shared Shopify Admin API access.
//
// The store authenticates with client_credentials rather than a long-lived
// Admin token, so every caller needs the same short token exchange. Each
// serverless function is its own process, so the token cache below is
// per-function by nature -- this module exists to keep one copy of the
// exchange logic, not to share a cache between endpoints.

const SHOPIFY_API_VERSION = '2024-10';

function shopifyDomain() {
  const raw = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!raw) return null;
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

let cachedShopifyToken = null;

async function getShopifyToken() {
  const domain = shopifyDomain();
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!domain || !clientId || !clientSecret) return null;

  if (cachedShopifyToken && cachedShopifyToken.expiresAt > Date.now()) {
    return cachedShopifyToken.token;
  }

  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  cachedShopifyToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 120) * 1000 };
  return cachedShopifyToken.token;
}

// Throws on transport failure or on GraphQL `errors`, so callers that need a
// product to exist fail loudly instead of rendering a certificate with blanks
// where the piece's name should be.
async function shopifyGraphql(query, variables = {}) {
  const domain = shopifyDomain();
  const token = await getShopifyToken();
  if (!domain || !token) throw new Error('Shopify credentials are not configured');

  const response = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify responded ${response.status}`);

  const payload = await response.json();
  if (payload.errors && payload.errors.length) {
    throw new Error(`Shopify GraphQL error: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  return payload.data;
}

module.exports = { SHOPIFY_API_VERSION, shopifyDomain, getShopifyToken, shopifyGraphql };
