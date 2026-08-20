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
        edges { node { id price inventoryItem { id } product { id status } } }
      }
    }`,
    { q: `sku:${sku}` }
  );
  return data.productVariants.edges[0]?.node || null;
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
  if (existing.product.status !== 'ACTIVE') {
    await shopifyGraphql(
      token,
      `mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { field message } } }`,
      { input: { id: existing.product.id, status: 'ACTIVE' } }
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

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (suppliedKey !== ADMIN_KEY) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');

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
