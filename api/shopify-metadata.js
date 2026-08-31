const API_VERSION = '2024-10';

function shopDomain() {
  const raw = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!raw) throw new Error('SHOPIFY_ADMIN_STORE_DOMAIN is not configured.');
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

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
    throw new Error(`Token exchange failed (${response.status}).`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  };
  return cachedToken.token;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  return fetchAccessToken();
}

async function shopifyGraphql(query, variables) {
  const token = await getAccessToken();
  const response = await fetch(`https://${shopDomain()}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(`Shopify GraphQL request failed (${response.status}).`);
  }
  return payload.data;
}

function numericId(gid) {
  return String(gid || '').split('/').pop();
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function loadProducts() {
  const products = [];
  let cursor = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await shopifyGraphql(
      `query($cursor: String) {
        products(first: 100, after: $cursor, query: "tag:sheet-sync") {
          edges {
            cursor
            node {
              id
              handle
              onlineStoreUrl
              variants(first: 1) {
                edges { node { id sku } }
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }`,
      { cursor }
    );

    const edges = data.products.edges;
    for (const edge of edges) {
      const variant = edge.node.variants.edges[0]?.node;
      const sku = String(variant?.sku || '').trim().toUpperCase();
      if (!sku) continue;
      products.push({
        sku,
        productId: numericId(edge.node.id),
        variantId: numericId(variant.id),
        productUrl: edge.node.onlineStoreUrl || `https://${shopDomain()}/products/${edge.node.handle}`,
      });
    }

    if (!data.products.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  products.sort((a, b) => a.sku.localeCompare(b.sku));
  return products;
}

export default async function handler(req, res) {
  try {
    const products = await loadProducts();
    const rows = [
      ['SKU', 'Shopify Product ID', 'Shopify Variant ID', 'Shopify Product URL'],
      ...products.map((product) => [product.sku, product.productId, product.variantId, product.productUrl]),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.statusCode = 200;
    res.end(`${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.statusCode = 500;
    res.end(`Unable to load Shopify metadata: ${error.message}`);
  }
}
