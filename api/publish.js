// One-off admin endpoint: publishes every "sheet-sync" tagged product to the
// Online Store sales channel. productCreate does NOT publish a product
// anywhere on its own -- a product can be status:ACTIVE and still be
// completely invisible on the storefront and unusable at checkout until it's
// explicitly published to a channel. The bulk catalog sync missed this step,
// so every synced product needs it applied after the fact.
// Gated by a bearer key baked in at deploy time; remove this file once the
// catalog is fully published.

const ONLINE_STORE_PUBLICATION_ID = 'gid://shopify/Publication/180567146566';
const API_VERSION = '2024-10';
const ADMIN_KEY = 'ce4dbfc3c446ba331b5dda0b4cea3bd7726a7f59c7c8a8e0';
const BATCH_LIMIT = 20;

function shopDomain() {
  const raw = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!raw) throw new Error('SHOPIFY_ADMIN_STORE_DOMAIN is not configured.');
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

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
  return data.access_token;
}

async function shopifyGraphql(token, query, variables) {
  const response = await fetch(`https://${shopDomain()}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors) throw new Error(`Shopify GraphQL error: ${JSON.stringify(payload.errors)}`);
  return payload.data;
}

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (suppliedKey !== ADMIN_KEY) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const token = await fetchAccessToken();
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

    const data = await shopifyGraphql(
      token,
      `query($after: String) {
        products(first: ${BATCH_LIMIT}, after: $after, query: "tag:sheet-sync") {
          edges { cursor node { id title } }
          pageInfo { hasNextPage }
        }
      }`,
      { after: cursor }
    );

    const edges = data.products.edges;
    let published = 0;
    const failures = [];

    for (const edge of edges) {
      try {
        const result = await shopifyGraphql(
          token,
          `mutation($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              userErrors { field message }
            }
          }`,
          { id: edge.node.id, input: [{ publicationId: ONLINE_STORE_PUBLICATION_ID }] }
        );
        const errors = result.publishablePublish.userErrors;
        if (errors.length) throw new Error(JSON.stringify(errors));
        published += 1;
      } catch (error) {
        failures.push({ id: edge.node.id, title: edge.node.title, error: error.message });
      }
    }

    const nextCursor = edges.length ? edges[edges.length - 1].cursor : null;
    res.statusCode = 200;
    res.end(
      JSON.stringify(
        {
          batchSize: edges.length,
          published,
          failures,
          done: !data.products.pageInfo.hasNextPage,
          nextCursor: data.products.pageInfo.hasNextPage ? nextCursor : null,
        },
        null,
        2
      )
    );
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
