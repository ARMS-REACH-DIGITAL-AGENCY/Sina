// "Adopt Me" hands off straight to Shopify checkout for one specific SKU --
// there's no cart to build since every piece is a single one-of-one item.
// This looks the SKU up in Shopify at click time (not from the Sheet, which
// only knows what *should* be available) so a piece someone just bought a
// minute ago correctly shows sold out instead of double-selling it.

function shopDomain() {
  // Named distinctly from the generic SHOPIFY_STORE_DOMAIN name because a
  // stray Vercel "Shopify Sandbox" marketplace integration already claims
  // that name for an unrelated demo store -- using our own name sidesteps
  // the collision instead of fighting over it.
  const raw = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!raw) throw new Error('SHOPIFY_ADMIN_STORE_DOMAIN is not configured.');
  // Tolerate a pasted-in protocol/trailing slash/whitespace -- easy to
  // accidentally include when copying a domain out of a browser bar, and
  // it turns the API URL below into an unreachable, malformed one.
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

// Shopify retired static custom-app tokens in 2026 -- apps built through the
// unified dev dashboard authenticate via the OAuth client credentials grant
// instead: trade the app's Client ID/Secret for a short-lived (24h) access
// token. Cached at module scope so a warm serverless container reuses it
// instead of re-authenticating on every click; a cold container or an
// expired cache just fetches a fresh one.
let cachedToken = null;

async function fetchAccessToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET are not configured.');
  }

  const response = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  // expires_in is seconds; refresh a couple minutes early to avoid a request
  // landing right on the boundary.
  const expiresAt = Date.now() + (data.expires_in - 120) * 1000;
  return { token: data.access_token, expiresAt };
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  cachedToken = await fetchAccessToken();
  return cachedToken.token;
}

async function shopifyGraphql(query, variables) {
  const token = await getAccessToken();

  const response = await fetch(`https://${shopDomain()}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

async function findVariantBySku(sku) {
  const data = await shopifyGraphql(
    `query($q: String!) {
      productVariants(first: 1, query: $q) {
        edges {
          node {
            id
            availableForSale
            inventoryQuantity
            product { onlineStoreUrl }
          }
        }
      }
    }`,
    { q: `sku:${sku}` }
  );

  return data.productVariants.edges[0]?.node || null;
}

function numericIdFromGid(gid) {
  return gid.split('/').pop();
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

export default async function handler(req, res) {
  const sku = typeof req.query.sku === 'string' ? req.query.sku.trim().toUpperCase() : '';

  if (!sku) {
    res.statusCode = 400;
    res.end('Missing sku.');
    return;
  }

  try {
    const variant = await findVariantBySku(sku);

    if (!variant || variant.inventoryQuantity <= 0 || !variant.availableForSale) {
      // Keep an adopted piece's permanent public URL alive. The product page
      // can explain that it found a home and direct the visitor to other work.
      redirect(res, `/p/${encodeURIComponent(sku)}?sold=1`);
      return;
    }

    const variantId = numericIdFromGid(variant.id);
    redirect(res, `https://${shopDomain()}/cart/${variantId}:1`);
  } catch (error) {
    res.statusCode = 500;
    // Include which domain we attempted (never the token) -- a bare
    // "fetch failed" gives no way to tell a bad domain value apart from
    // a real outage.
    let attemptedDomain = 'unknown';
    try {
      attemptedDomain = shopDomain();
    } catch (_) {
      // shopDomain() itself threw -- its message already covers this case.
    }
    res.end(`Unable to start checkout (domain: ${attemptedDomain}): ${error.message}`);
  }
}
