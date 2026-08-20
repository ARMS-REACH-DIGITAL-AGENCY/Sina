// One-off admin endpoint: reconciles Shopify against the Google Sheet, the
// same logic as scripts/sync-shopify.mjs but reachable as a batched HTTP
// call so it can run from the live deployment (where SHOPIFY_* creds
// actually live) without timing out a single serverless invocation on ~270
// products. Call with mode=batch repeatedly until done:true, then mode=
// archive once at the very end to retire any Shopify product whose SKU no
// longer exists in the Sheet. Gated by the same admin key pattern as the
// other one-off endpoints in this file. Delete once the sync is verified.

const ADMIN_KEY = 'ce4dbfc3c446ba331b5dda0b4cea3bd7726a7f59c7c8a8e0';
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1yTKJUw-OjpI6V2wxUtfSVq61b3NV3g9EcaZxsUEbfBY/export?format=csv&gid=1901402257';
const SYNC_TAG = 'sheet-sync';
const API_VERSION = '2024-10';
const IMAGE_BASE_URL = 'https://sinasglass.com/images/products';
const EXTENSION_CANDIDATES = ['JPG', 'jpg', 'jpeg', 'JPEG', 'png', 'PNG'];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += character;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeSku(row) {
  const resolved = normalizeText(row.SKU) || normalizeText(row['Variant SKU']) || normalizeText(row['Final SKU']);
  return resolved.toUpperCase();
}

function normalizePrice(value) {
  const parsed = Number.parseFloat(normalizeText(value));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

async function fetchSheetRows() {
  const response = await fetch(SHEET_CSV_URL, { headers: { Accept: 'text/csv' } });
  if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`);
  const csvText = await response.text();
  const [header = [], ...rows] = parseCsv(csvText);
  const keys = header.map((value, index) => normalizeText(value) || `__col_${index}`);

  return rows
    .filter((row) => row.some((cell) => normalizeText(cell)))
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ''])))
    .filter((row) => normalizeText(row.Published).toUpperCase() === 'TRUE')
    .filter((row) => normalizeSku(row) && normalizeText(row.Title))
    .map((row) => ({
      sku: normalizeSku(row),
      title: normalizeText(row.Title),
      price: normalizePrice(row['Variant Price']),
      category: normalizeText(row.Collection) || normalizeText(row.Type) || 'Creations',
      imageFilename: normalizeText(row['Image 1 Filename']) || normalizeText(row['Final Image Filename']),
    }));
}

// Same case/extension resilience as api/catalog.js and api/photoroom-edit.js
// -- the Sheet's stated extension often doesn't match what's actually on
// disk, so try every common candidate before trusting it. Uses a ranged GET
// rather than HEAD -- Vercel's static file serving doesn't reliably answer
// HEAD requests with a real content-type (confirmed: files that GET fine
// were coming back false-negative on HEAD), so a 1-byte GET is the only
// reliable existence check here.
async function resolveImageUrl(statedFilename) {
  if (!statedFilename) return null;
  const dot = statedFilename.lastIndexOf('.');
  const base = dot === -1 ? statedFilename : statedFilename.slice(0, dot);
  const statedExt = dot === -1 ? '' : statedFilename.slice(dot + 1);

  // Dedupe by exact string, not lowercased -- the filesystem is
  // case-sensitive, so "JPG" and "jpg" are genuinely different candidates
  // that both need a real attempt, not one standing in for the other.
  const candidates = [...new Set([statedExt, ...EXTENSION_CANDIDATES].filter(Boolean))];

  for (const ext of candidates) {
    const url = `${IMAGE_BASE_URL}/${encodeURIComponent(`${base}.${ext}`)}`;
    const response = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    const contentType = response.headers.get('content-type') || '';
    if ((response.ok || response.status === 206) && contentType.startsWith('image/')) return url;
  }
  return null;
}

async function getProductMediaInfo(token, sku) {
  const data = await shopifyGraphql(
    token,
    `query($q: String!) {
      productVariants(first: 1, query: $q) {
        edges { node { product { id media(first: 1) { edges { node { id } } } } } }
      }
    }`,
    { q: `sku:${sku}` }
  );
  const node = data.productVariants.edges[0]?.node;
  if (!node) return null;
  return { productId: node.product.id, hasMedia: node.product.media.edges.length > 0 };
}

async function attachProductImage(token, productId, imageUrl) {
  const result = await shopifyGraphql(
    token,
    `mutation($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { id }
        mediaUserErrors { field message }
      }
    }`,
    { productId, media: [{ originalSource: imageUrl, mediaContentType: 'IMAGE' }] }
  );
  const errors = result.productCreateMedia.mediaUserErrors;
  if (errors.length) throw new Error(`productCreateMedia failed: ${JSON.stringify(errors)}`);
}

function shopDomain() {
  const raw = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!raw) throw new Error('SHOPIFY_ADMIN_STORE_DOMAIN is not configured.');
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

async function fetchAccessToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET are not configured.');

  const response = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!response.ok) throw new Error(`Token exchange failed (${response.status}): ${await response.text()}`);
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

async function getPrimaryLocationId(token) {
  const data = await shopifyGraphql(token, `query { locations(first: 1) { edges { node { id } } } }`);
  const id = data.locations.edges[0]?.node.id;
  if (!id) throw new Error('Store has no locations to hold inventory.');
  return id;
}

async function findVariantBySku(token, sku) {
  const data = await shopifyGraphql(
    token,
    `query($q: String!) {
      productVariants(first: 1, query: $q) {
        edges { node { id price inventoryItem { id } product { id status title } } }
      }
    }`,
    { q: `sku:${sku}` }
  );
  return data.productVariants.edges[0]?.node || null;
}

let cachedOnlineStorePublicationId = null;

// A freshly created product is ACTIVE but published to zero sales channels
// by default -- that's a separate step from productCreate in this API
// version. Without it, the product looks fine in the admin but the
// storefront cart can't add it ("Link no longer exists"). Look the
// channel's id up by name once and cache it, rather than hardcoding a
// store-specific id.
async function getOnlineStorePublicationId(token) {
  if (cachedOnlineStorePublicationId) return cachedOnlineStorePublicationId;
  const data = await shopifyGraphql(token, `query { publications(first: 10) { edges { node { id name } } } }`);
  const match = data.publications.edges.find((edge) => edge.node.name === 'Online Store');
  if (!match) throw new Error('No "Online Store" sales channel found on this Shopify store.');
  cachedOnlineStorePublicationId = match.node.id;
  return cachedOnlineStorePublicationId;
}

async function publishToOnlineStore(token, productId) {
  const publicationId = await getOnlineStorePublicationId(token);
  const result = await shopifyGraphql(
    token,
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }`,
    { id: productId, input: [{ publicationId }] }
  );
  const errors = result.publishablePublish.userErrors;
  if (errors.length) throw new Error(`publishablePublish failed for ${productId}: ${JSON.stringify(errors)}`);
}

async function setInventory(token, inventoryItemId, locationId, quantity) {
  await shopifyGraphql(
    token,
    `mutation($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) { userErrors { field message } }
    }`,
    { input: { reason: 'correction', setQuantities: [{ inventoryItemId, locationId, quantity }] } }
  );
}

async function createProduct(token, row, locationId) {
  const created = await shopifyGraphql(
    token,
    `mutation($input: ProductInput!) {
      productCreate(input: $input) {
        product { id variants(first: 1) { edges { node { id } } } }
        userErrors { field message }
      }
    }`,
    {
      input: {
        title: row.title,
        vendor: "Sina's Creations",
        productType: row.category,
        status: 'ACTIVE',
        tags: [SYNC_TAG, 'adopt', 'one-of-one'],
      },
    }
  );

  const errors = created.productCreate.userErrors;
  if (errors.length) throw new Error(`productCreate failed for ${row.sku}: ${JSON.stringify(errors)}`);
  const productId = created.productCreate.product.id;
  const defaultVariantId = created.productCreate.product.variants.edges[0]?.node.id;
  if (!defaultVariantId) throw new Error(`productCreate for ${row.sku} returned no default variant.`);

  await publishToOnlineStore(token, productId);

  const variantResult = await shopifyGraphql(
    token,
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id inventoryItem { id } }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [{ id: defaultVariantId, price: row.price, inventoryItem: { sku: row.sku, tracked: true } }],
    }
  );

  const variantErrors = variantResult.productVariantsBulkUpdate.userErrors;
  if (variantErrors.length) throw new Error(`variant update failed for ${row.sku}: ${JSON.stringify(variantErrors)}`);

  const inventoryItemId = variantResult.productVariantsBulkUpdate.productVariants[0].inventoryItem.id;
  await setInventory(token, inventoryItemId, locationId, 1);
  return 'created';
}

async function updateProduct(token, existing, row, locationId) {
  // Photoroom's own "Publish to Shopify" button pushes its own cached title
  // back onto the product along with the image -- it doesn't know the Sheet
  // is the source of truth, so it can silently overwrite a correct title
  // with a stale one. Correcting it back here on every sync is the backstop
  // for that, not just for a title that was never set correctly to begin
  // with.
  const titleDrifted = existing.product.status === 'ACTIVE' && existing.product.title !== row.title;
  if (existing.product.status !== 'ACTIVE' || titleDrifted) {
    await shopifyGraphql(
      token,
      `mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { field message } } }`,
      { input: { id: existing.product.id, status: 'ACTIVE', title: row.title } }
    );
  }

  if (existing.price !== row.price) {
    await shopifyGraphql(
      token,
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
      }`,
      { productId: existing.product.id, variants: [{ id: existing.id, price: row.price }] }
    );
  }

  await setInventory(token, existing.inventoryItem.id, locationId, 1);
  return 'updated';
}

async function archiveMissingProducts(token, syncedSkus) {
  let archived = 0;
  let cursor = null;
  const query = `tag:${SYNC_TAG} AND status:active`;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await shopifyGraphql(
      token,
      `query($q: String!, $after: String) {
        productVariants(first: 50, query: $q, after: $after) {
          edges { cursor node { sku product { id } } }
          pageInfo { hasNextPage }
        }
      }`,
      { q: query, after: cursor }
    );

    const edges = data.productVariants.edges;
    for (const edge of edges) {
      const sku = edge.node.sku?.toUpperCase();
      if (sku && !syncedSkus.has(sku)) {
        await shopifyGraphql(
          token,
          `mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { field message } } }`,
          { input: { id: edge.node.product.id, status: 'ARCHIVED' } }
        );
        archived += 1;
      }
    }

    if (!data.productVariants.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  return archived;
}

const REDIRECT_MARKER = 'sina-storefront-redirect';
const REDIRECT_TARGET = 'https://sinasglass.com';

// The raw *.myshopify.com storefront is reachable by anyone who stumbles on
// it (shared link, search engine, typo) even though nothing ever links to
// it on purpose -- it's Shopify's unstyled default theme, not the real
// site. Rather than build and maintain a second themed storefront in sync
// with the real one forever, this sends any such visitor straight to the
// real site. Injected once into the active theme's layout/theme.liquid,
// guarded by REDIRECT_MARKER so re-running this is a no-op if it's already
// there.
async function restAdminFetch(path, options = {}) {
  const domain = shopDomain();
  const token = await fetchAccessToken();
  const response = await fetch(`https://${domain}/admin/api/${API_VERSION}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Shopify REST API failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

async function addStorefrontRedirect() {
  const themesData = await restAdminFetch('/themes.json');
  const mainTheme = themesData.themes.find((t) => t.role === 'main');
  if (!mainTheme) throw new Error('No active (role=main) theme found.');

  const assetData = await restAdminFetch(`/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`);
  const currentValue = assetData.asset.value;

  if (currentValue.includes(REDIRECT_MARKER)) {
    return { themeId: mainTheme.id, themeName: mainTheme.name, status: 'already-present' };
  }

  const headCloseIndex = currentValue.indexOf('</head>');
  if (headCloseIndex === -1) throw new Error('theme.liquid has no </head> tag to inject before.');

  const script = `<script id="${REDIRECT_MARKER}">window.location.replace(${JSON.stringify(REDIRECT_TARGET)});</script>\n`;
  const updatedValue = currentValue.slice(0, headCloseIndex) + script + currentValue.slice(headCloseIndex);

  await restAdminFetch(`/themes/${mainTheme.id}/assets.json`, {
    method: 'PUT',
    body: JSON.stringify({ asset: { key: 'layout/theme.liquid', value: updatedValue } }),
  });

  return { themeId: mainTheme.id, themeName: mainTheme.name, status: 'added' };
}

// Finds Shopify products that are genuine leftover duplicates from before a
// SKU got corrected in the Sheet -- not just "photo not synced yet" (those
// are still current SKUs, just missing a file on disk). A product only
// qualifies here if BOTH: it has zero media (the visible tell) AND its SKU
// doesn't match any row currently in the Sheet at all (the safety check, so
// a real current product that just hasn't gotten a photo yet is never
// caught by this).
async function findDuplicateProducts(token) {
  const rows = await fetchSheetRows();
  const currentSkus = new Set(rows.map((r) => r.sku));

  const candidates = [];
  let cursor = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await shopifyGraphql(
      token,
      `query($cursor: String) {
        products(first: 100, after: $cursor, query: "tag:sheet-sync") {
          edges {
            cursor
            node {
              id
              title
              media(first: 1) { edges { node { id } } }
              variants(first: 1) { edges { node { sku } } }
            }
          }
          pageInfo { hasNextPage }
        }
      }`,
      { cursor }
    );

    const edges = data.products.edges;
    for (const edge of edges) {
      const sku = edge.node.variants.edges[0]?.node.sku?.trim().toUpperCase() || '';
      const hasMedia = edge.node.media.edges.length > 0;
      if (!hasMedia && !currentSkus.has(sku)) {
        candidates.push({ id: edge.node.id, sku, title: edge.node.title });
      }
    }

    if (!data.products.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  return candidates;
}

async function deleteProduct(token, productId) {
  const result = await shopifyGraphql(
    token,
    `mutation($input: ProductDeleteInput!) {
      productDelete(input: $input) { deletedProductId userErrors { field message } }
    }`,
    { input: { id: productId } }
  );
  const errors = result.productDelete.userErrors;
  if (errors.length) throw new Error(JSON.stringify(errors));
}

// One-time repair for products that were created before publishToOnlineStore
// existed in createProduct() -- they're ACTIVE but published to zero sales
// channels, so checkout silently fails ("Link no longer exists"). Finds
// every tag:sheet-sync product with resourcePublicationsCount 0 and
// publishes it. Safe to re-run: already-published products are skipped.
async function fixUnpublishedProducts(token) {
  const publicationId = await getOnlineStorePublicationId(token);
  const fixed = [];
  let cursor = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await shopifyGraphql(
      token,
      `query($cursor: String) {
        products(first: 100, after: $cursor, query: "tag:sheet-sync") {
          edges {
            cursor
            node {
              id
              resourcePublicationsCount { count }
              variants(first: 1) { edges { node { sku } } }
            }
          }
          pageInfo { hasNextPage }
        }
      }`,
      { cursor }
    );

    const edges = data.products.edges;
    for (const edge of edges) {
      if (edge.node.resourcePublicationsCount.count > 0) continue;
      const sku = edge.node.variants.edges[0]?.node.sku || '(no sku)';
      try {
        const result = await shopifyGraphql(
          token,
          `mutation($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) { userErrors { field message } }
          }`,
          { id: edge.node.id, input: [{ publicationId }] }
        );
        const errors = result.publishablePublish.userErrors;
        if (errors.length) throw new Error(JSON.stringify(errors));
        fixed.push({ sku, status: 'published' });
      } catch (error) {
        fixed.push({ sku, status: 'error', error: error.message });
      }
    }

    if (!data.products.pageInfo.hasNextPage || edges.length === 0) break;
    cursor = edges[edges.length - 1].cursor;
  }

  return fixed;
}

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (suppliedKey !== ADMIN_KEY) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  if (req.query.mode === 'redirect-storefront') {
    try {
      const result = await addStorefrontRedirect();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }, null, 2));
    }
    return;
  }

  if (req.query.mode === 'proxy-image') {
    const url = typeof req.query.url === 'string' ? req.query.url : '';
    if (!url.startsWith('https://cdn.shopify.com/')) {
      res.statusCode = 400;
      res.end('url must be a cdn.shopify.com image.');
      return;
    }
    try {
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      // Raw binary mangles when it round-trips through the calling tool's
      // JSON transport (invalid-UTF-8 byte sequences get lossy-decoded and
      // corrupted) -- base64 is plain ASCII, so it survives that transport
      // intact, at the cost of being read back out via a decode step.
      res.end(JSON.stringify({ contentType: response.headers.get('content-type') || 'image/jpeg', base64: buffer.toString('base64') }));
    } catch (error) {
      res.statusCode = 500;
      res.end(error.message);
    }
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  if (req.query.mode === 'find-duplicates') {
    try {
      const token = await fetchAccessToken();
      const candidates = await findDuplicateProducts(token);

      if (req.query.confirm === '1') {
        const results = [];
        for (const candidate of candidates) {
          try {
            await deleteProduct(token, candidate.id);
            results.push({ ...candidate, status: 'deleted' });
          } catch (error) {
            results.push({ ...candidate, status: 'error', error: error.message });
          }
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ deleted: results.filter((r) => r.status === 'deleted').length, results }, null, 2));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ dryRun: true, count: candidates.length, candidates }, null, 2));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }, null, 2));
    }
    return;
  }

  if (req.query.mode === 'fix-publications') {
    try {
      const token = await fetchAccessToken();
      const results = await fixUnpublishedProducts(token);
      res.statusCode = 200;
      res.end(JSON.stringify({ totalFixed: results.filter((r) => r.status === 'published').length, results }, null, 2));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }, null, 2));
    }
    return;
  }

  if (req.query.mode === 'debug-publication') {
    const sku = typeof req.query.sku === 'string' ? req.query.sku.trim().toUpperCase() : '';
    try {
      const token = await fetchAccessToken();
      const data = await shopifyGraphql(
        token,
        `query($q: String!) {
          productVariants(first: 1, query: $q) {
            edges {
              node {
                id
                sku
                availableForSale
                product {
                  id
                  title
                  status
                  resourcePublicationsCount { count }
                }
              }
            }
          }
          publications(first: 10) { edges { node { id name } } }
        }`,
        { q: `sku:${sku}` }
      );
      res.statusCode = 200;
      res.end(JSON.stringify(data, null, 2));
    } catch (error) {
      res.statusCode = 200;
      res.end(JSON.stringify({ error: error.message }, null, 2));
    }
    return;
  }

  if (req.query.mode === 'debug-image') {
    const filename = typeof req.query.filename === 'string' ? req.query.filename : '';
    const url = `${IMAGE_BASE_URL}/${encodeURIComponent(filename)}`;
    try {
      const response = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      res.statusCode = 200;
      res.end(
        JSON.stringify(
          {
            url,
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
          },
          null,
          2
        )
      );
    } catch (error) {
      res.statusCode = 200;
      res.end(JSON.stringify({ url, error: error.message }, null, 2));
    }
    return;
  }

  try {
    if (req.query.mode === 'archive') {
      const token = await fetchAccessToken();
      const rows = await fetchSheetRows();
      const syncedSkus = new Set(rows.map((r) => r.sku));
      const archived = await archiveMissingProducts(token, syncedSkus);
      res.statusCode = 200;
      res.end(JSON.stringify({ archived }, null, 2));
      return;
    }

    if (req.query.mode === 'images') {
      const offset = Number.parseInt(req.query.offset, 10) || 0;
      const limit = Number.parseInt(req.query.limit, 10) || 15;
      const force = req.query.force === '1';

      const token = await fetchAccessToken();
      const rows = await fetchSheetRows();
      const batch = rows.slice(offset, offset + limit);

      const results = [];
      for (const row of batch) {
        try {
          const info = await getProductMediaInfo(token, row.sku);
          if (!info) {
            results.push({ sku: row.sku, title: row.title, status: 'no-shopify-product' });
            continue;
          }
          if (info.hasMedia && !force) {
            results.push({ sku: row.sku, title: row.title, status: 'skipped-has-media' });
            continue;
          }
          const imageUrl = await resolveImageUrl(row.imageFilename);
          if (!imageUrl) {
            results.push({ sku: row.sku, title: row.title, status: 'no-image-found', imageFilename: row.imageFilename });
            continue;
          }
          await attachProductImage(token, info.productId, imageUrl);
          results.push({ sku: row.sku, title: row.title, status: 'attached', imageUrl });
        } catch (error) {
          results.push({ sku: row.sku, title: row.title, status: 'error', error: error.message });
        }
      }

      const nextOffset = offset + limit;
      res.statusCode = 200;
      res.end(
        JSON.stringify(
          {
            totalRows: rows.length,
            batchStart: offset,
            batchSize: batch.length,
            results,
            done: nextOffset >= rows.length,
            nextOffset: nextOffset < rows.length ? nextOffset : null,
          },
          null,
          2
        )
      );
      return;
    }

    // default: batch create/update
    const offset = Number.parseInt(req.query.offset, 10) || 0;
    const limit = Number.parseInt(req.query.limit, 10) || 20;

    const token = await fetchAccessToken();
    const rows = await fetchSheetRows();
    const locationId = await getPrimaryLocationId(token);
    const batch = rows.slice(offset, offset + limit);

    const results = [];
    for (const row of batch) {
      try {
        const existing = await findVariantBySku(token, row.sku);
        if (existing) {
          await updateProduct(token, existing, row, locationId);
          results.push({ sku: row.sku, title: row.title, status: 'updated' });
        } else {
          await createProduct(token, row, locationId);
          results.push({ sku: row.sku, title: row.title, status: 'created' });
        }
      } catch (error) {
        results.push({ sku: row.sku, title: row.title, status: 'error', error: error.message });
      }
    }

    const nextOffset = offset + limit;
    res.statusCode = 200;
    res.end(
      JSON.stringify(
        {
          totalRows: rows.length,
          batchStart: offset,
          batchSize: batch.length,
          results,
          done: nextOffset >= rows.length,
          nextOffset: nextOffset < rows.length ? nextOffset : null,
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
