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

async function shopifyGraphql(query, variables) {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!token) throw new Error('SHOPIFY_ADMIN_TOKEN is not configured.');

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
      // Already adopted (or never made it into Shopify) -- send them back to
      // the piece's own page instead of a dead end, with a flag the front
      // end can use to say "sorry, this one's been adopted."
      redirect(res, `/shop?sku=${encodeURIComponent(sku)}&sold=1`);
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
