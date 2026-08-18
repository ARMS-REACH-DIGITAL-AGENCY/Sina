#!/usr/bin/env node
// Pushes the Google Sheet catalog into Shopify as minimal, checkout-only
// records (title/price/SKU/qty=1) -- the Sheet stays the only place anyone
// edits a description, photo, or category. Shopify never needs to match
// that content; it only needs to know a SKU exists, what it costs, and
// whether it's still available.
//
// Every product this script creates is tagged "sheet-sync" so it only ever
// touches records it manages -- a row that drops out of the Sheet's
// published rows (sold, pulled) gets its Shopify twin archived, not
// deleted, so nothing is ever silently unrecoverable.
//
// Usage: SHOPIFY_ADMIN_STORE_DOMAIN=... SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... node scripts/sync-shopify.mjs

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1yTKJUw-OjpI6V2wxUtfSVq61b3NV3g9EcaZxsUEbfBY/export?format=csv&gid=1901402257';
const SYNC_TAG = 'sheet-sync';
const API_VERSION = '2024-10';

// Named distinctly from the generic SHOPIFY_STORE_DOMAIN name because a
// stray Vercel "Shopify Sandbox" marketplace integration already claims
// that name for an unrelated demo store -- using our own name sidesteps
// the collision instead of fighting over it.
// Tolerate a pasted-in protocol/trailing slash/whitespace -- easy to
// accidentally include when copying a domain out of a browser bar, and
// it turns the API URL below into an unreachable, malformed one.
const domain = (process.env.SHOPIFY_ADMIN_STORE_DOMAIN || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

if (!domain || !clientId || !clientSecret) {
  console.error('Set SHOPIFY_ADMIN_STORE_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET before running this script.');
  process.exit(1);
}

// Shopify retired static custom-app tokens in 2026 -- trade the app's
// Client ID/Secret for a short-lived (24h) access token via the OAuth
// client credentials grant. Fetched once and reused for the whole run,
// since a sync takes minutes, not the full 24-hour window.
async function fetchAccessToken() {
  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
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

let token;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Same CSV parser as api/catalog.js -- kept as its own copy here since this
// script runs standalone (via `node`, not the Vercel function runtime).
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
    }));
}

async function shopifyGraphql(query, variables) {
  const response = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors) throw new Error(`Shopify GraphQL error: ${JSON.stringify(payload.errors)}`);
  return payload.data;
}

async function getPrimaryLocationId() {
  const data = await shopifyGraphql(`query { locations(first: 1) { edges { node { id } } } }`);
  const id = data.locations.edges[0]?.node.id;
  if (!id) throw new Error('Store has no locations to hold inventory.');
  return id;
}

async function findVariantBySku(sku) {
  const data = await shopifyGraphql(
    `query($q: String!) {
      productVariants(first: 1, query: $q) {
        edges { node { id price inventoryItem { id } product { id status } } }
      }
    }`,
    { q: `sku:${sku}` }
  );
  return data.productVariants.edges[0]?.node || null;
}

async function setInventory(inventoryItemId, locationId, quantity) {
  await shopifyGraphql(
    `mutation($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        userErrors { field message }
      }
    }`,
    {
      input: {
        reason: 'correction',
        setQuantities: [{ inventoryItemId, locationId, quantity }],
      },
    }
  );
}

async function createProduct(row, locationId) {
  // productCreate always auto-creates a "Default Title" variant, so
  // productVariantsBulkCreate right after it collides ("variant already
  // exists") -- the fix is to update that auto-created variant in place
  // instead of trying to create a second one.
  const created = await shopifyGraphql(
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
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id inventoryItem { id } }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          id: defaultVariantId,
          price: row.price,
          inventoryItem: { sku: row.sku, tracked: true },
        },
      ],
    }
  );

  const variantErrors = variantResult.productVariantsBulkUpdate.userErrors;
  if (variantErrors.length) throw new Error(`variant update failed for ${row.sku}: ${JSON.stringify(variantErrors)}`);

  const inventoryItemId = variantResult.productVariantsBulkUpdate.productVariants[0].inventoryItem.id;
  await setInventory(inventoryItemId, locationId, 1);

  return 'created';
}

async function updateProduct(existing, row, locationId) {
  if (existing.product.status !== 'ACTIVE') {
    await shopifyGraphql(
      `mutation($input: ProductInput!) {
        productUpdate(input: $input) { userErrors { field message } }
      }`,
      { input: { id: existing.product.id, status: 'ACTIVE' } }
    );
  }

  if (existing.price !== row.price) {
    await shopifyGraphql(
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { field message }
        }
      }`,
      { productId: existing.product.id, variants: [{ id: existing.id, price: row.price }] }
    );
  }

  await setInventory(existing.inventoryItem.id, locationId, 1);
  return 'updated';
}

async function archiveMissingProducts(syncedSkus) {
  let archived = 0;
  let cursor = null;
  const query = `tag:${SYNC_TAG} AND status:active`;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await shopifyGraphql(
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
          `mutation($input: ProductInput!) {
            productUpdate(input: $input) { userErrors { field message } }
          }`,
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

async function main() {
  token = await fetchAccessToken();
  const rows = await fetchSheetRows();
  console.log(`Sheet has ${rows.length} published rows with a SKU.`);

  const locationId = await getPrimaryLocationId();
  const syncedSkus = new Set();
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    syncedSkus.add(row.sku);
    try {
      const existing = await findVariantBySku(row.sku);
      if (existing) {
        await updateProduct(existing, row, locationId);
        updated += 1;
      } else {
        await createProduct(row, locationId);
        created += 1;
      }
      process.stdout.write('.');
    } catch (error) {
      failed += 1;
      console.error(`\n${row.sku}: ${error.message}`);
    }
    // Small pause to stay well under Shopify's GraphQL cost throttle.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(`\nCreated ${created}, updated ${updated}, failed ${failed}.`);

  const archived = await archiveMissingProducts(syncedSkus);
  console.log(`Archived ${archived} product(s) no longer published in the Sheet.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
