// Keeps Shopify useful as a commerce/discovery engine without making it the
// primary Sina's Creations brand site. This job:
// 1) removes the old blanket *.myshopify.com -> Sina homepage redirect,
// 2) enriches active sheet-synced products with the Sheet's story and SEO,
// 3) publishes them to useful installed channels (Online Store, Shop,
//    TikTok, and future Meta/Google publications when those apps exist).
//
// Vercel cron calls mode=recent after the main catalog sync. For a one-time
// full backfill, call mode=backfill repeatedly with the returned nextCursor.

const ADMIN_KEY = 'ce4dbfc3c446ba331b5dda0b4cea3bd7726a7f59c7c8a8e0';
const API_VERSION = '2024-10';
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1yTKJUw-OjpI6V2wxUtfSVq61b3NV3g9EcaZxsUEbfBY/export?format=csv&gid=1901402257';
const REDIRECT_MARKER = 'sina-storefront-redirect';

const DESIRED_PUBLICATION_NAMES = new Set([
  'Online Store',
  'Shop',
  'TikTok',
  'Facebook & Instagram',
  'Facebook and Instagram',
  'Facebook',
  'Instagram',
  'Google & YouTube',
  'Google and YouTube',
  'Google',
]);

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

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || '')
      .replace(/\[\[SIZE_TBD\]\]/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, max) {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function cleanDescriptionHtml(value) {
  return normalizeText(String(value || '').replace(/\[\[SIZE_TBD\]\]/gi, ''));
}

function normalizeSku(row) {
  return (
    normalizeText(row.SKU)
    || normalizeText(row['Variant SKU'])
    || normalizeText(row['Final SKU'])
  ).toUpperCase();
}

function singularCategory(category) {
  const map = {
    Pendants: 'Pendant',
    Necklaces: 'Necklace',
    'Ocean Necklaces': 'Necklace',
    Lanyards: 'Lanyard',
    Plates: 'Plate',
    Plaques: 'Plaque',
    Charms: 'Charm',
    Sets: 'Jewelry Set',
    Ornaments: 'Ornament',
    'Wire Wrapped': 'Pendant',
  };
  return map[category] || String(category || 'Creation').replace(/s$/i, '');
}

function splitTags(value) {
  return String(value || '')
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTags(row) {
  const tags = [
    'sheet-sync',
    'one-of-one',
    'adopt',
    'fused glass',
    'handcrafted',
    row.category,
    row.size,
    ...splitTags(row.tags),
    ...splitTags(row.colorNames),
  ]
    .map((tag) => normalizeText(tag))
    .filter(Boolean);

  const seen = new Set();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSeoTitle(row) {
  return truncate(`${row.title} — One-of-One Fused Glass ${singularCategory(row.category)} | Sina's Creations`, 70);
}

function buildSeoDescription(row) {
  const story = stripHtml(row.bodyHtml);
  return truncate(
    story || `${row.title} is a one-of-one fused glass ${singularCategory(row.category).toLowerCase()} handcrafted by Thomasina Schnepf.`,
    155
  );
}

async function fetchSheetRows() {
  const response = await fetch(SHEET_CSV_URL, { headers: { Accept: 'text/csv' } });
  if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`);
  const csvText = await response.text();
  const [header = [], ...rows] = parseCsv(csvText);
  const keys = header.map((value, index) => normalizeText(value) || `__col_${index}`);

  const products = rows
    .filter((row) => row.some((cell) => normalizeText(cell)))
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ''])))
    .filter((row) => normalizeText(row.Published).toUpperCase() === 'TRUE')
    .map((row) => ({
      sku: normalizeSku(row),
      title: normalizeText(row.Title),
      bodyHtml: cleanDescriptionHtml(row['Body (HTML)']),
      category: normalizeText(row.Collection) || 'Creations',
      tags: normalizeText(row.Tags),
      size: normalizeText(row.Size),
      colorNames: normalizeText(row['Human Colors']),
      publicUrl: normalizeText(row['Public Product URL']),
    }))
    .filter((row) => row.sku && row.title);

  return new Map(products.map((row) => [row.sku, row]));
}

function shopDomain() {
  const raw = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!raw) throw new Error('SHOPIFY_ADMIN_STORE_DOMAIN is not configured.');
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

let cachedToken = null;
async function fetchAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET are not configured.');

  const response = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!response.ok) throw new Error(`Shopify token exchange failed (${response.status}).`);

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 120) * 1000,
  };
  return cachedToken.token;
}

async function shopifyGraphql(token, query, variables = {}) {
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
    throw new Error(`Shopify GraphQL failed (${response.status}): ${JSON.stringify(payload.errors || payload)}`);
  }
  return payload.data;
}

async function restAdminFetch(token, path, options = {}) {
  const response = await fetch(`https://${shopDomain()}/admin/api/${API_VERSION}${path}`, {
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

async function removeBlanketStorefrontRedirect(token) {
  const themesData = await restAdminFetch(token, '/themes.json');
  const mainTheme = themesData.themes.find((theme) => theme.role === 'main');
  if (!mainTheme) throw new Error('No active Shopify theme found.');

  const assetData = await restAdminFetch(token, `/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`);
  const currentValue = String(assetData.asset?.value || '');
  if (!currentValue.includes(REDIRECT_MARKER)) {
    return { themeId: mainTheme.id, themeName: mainTheme.name, status: 'already-removed' };
  }

  const markerPattern = new RegExp(`<script[^>]*id=["']${REDIRECT_MARKER}["'][^>]*>[\\s\\S]*?<\\/script>\\s*`, 'i');
  const updatedValue = currentValue.replace(markerPattern, '');
  if (updatedValue === currentValue) throw new Error('Redirect marker exists but the injected script could not be removed safely.');

  await restAdminFetch(token, `/themes/${mainTheme.id}/assets.json`, {
    method: 'PUT',
    body: JSON.stringify({ asset: { key: 'layout/theme.liquid', value: updatedValue } }),
  });

  return { themeId: mainTheme.id, themeName: mainTheme.name, status: 'removed' };
}

async function getDesiredPublications(token) {
  const data = await shopifyGraphql(token, `query { publications(first: 50) { edges { node { id name } } } }`);
  const installed = data.publications.edges.map((edge) => edge.node);
  const desired = installed.filter((publication) => DESIRED_PUBLICATION_NAMES.has(publication.name));
  return { installed, desired };
}

async function updateProductMerchandising(token, productId, row) {
  const result = await shopifyGraphql(
    token,
    `mutation($input: ProductInput!) {
      productUpdate(input: $input) { product { id } userErrors { field message } }
    }`,
    {
      input: {
        id: productId,
        title: row.title,
        vendor: "Sina's Creations",
        productType: row.category,
        descriptionHtml: row.bodyHtml,
        tags: buildTags(row),
        seo: {
          title: buildSeoTitle(row),
          description: buildSeoDescription(row),
        },
      },
    }
  );

  const errors = result.productUpdate.userErrors;
  if (errors.length) throw new Error(`productUpdate failed: ${JSON.stringify(errors)}`);
}

async function publishProduct(token, productId, publications) {
  if (!publications.length) return [];
  const input = publications.map((publication) => ({ publicationId: publication.id }));
  const result = await shopifyGraphql(
    token,
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { field message } }
    }`,
    { id: productId, input }
  );

  const errors = result.publishablePublish.userErrors;
  if (errors.length) throw new Error(`publishablePublish failed: ${JSON.stringify(errors)}`);
  return publications.map((publication) => publication.name);
}

async function fetchProductBatch(token, { cursor = null, limit = 25, recent = false } = {}) {
  const sortArgs = recent ? ', sortKey: UPDATED_AT, reverse: true' : '';
  const data = await shopifyGraphql(
    token,
    `query($cursor: String, $limit: Int!) {
      products(first: $limit, after: $cursor, query: "tag:sheet-sync"${sortArgs}) {
        edges {
          cursor
          node {
            id
            title
            status
            resourcePublicationsCount { count }
            variants(first: 1) { edges { node { sku availableForSale inventoryQuantity } } }
          }
        }
        pageInfo { hasNextPage }
      }
    }`,
    { cursor, limit }
  );
  return data.products;
}

async function processBatch(token, sheetBySku, publications, options) {
  const connection = await fetchProductBatch(token, options);
  const results = [];

  for (const edge of connection.edges) {
    const product = edge.node;
    const variant = product.variants.edges[0]?.node;
    const sku = normalizeText(variant?.sku).toUpperCase();
    const row = sheetBySku.get(sku);

    if (!sku || !row) {
      results.push({ sku: sku || null, title: product.title, status: 'skipped-no-sheet-row' });
      continue;
    }

    if (product.status !== 'ACTIVE' || variant?.availableForSale === false) {
      results.push({ sku, title: product.title, status: 'skipped-not-active' });
      continue;
    }

    const item = { sku, title: row.title, status: 'updated' };
    try {
      await updateProductMerchandising(token, product.id, row);
      item.publications = await publishProduct(token, product.id, publications);
    } catch (error) {
      item.status = 'error';
      item.error = error.message;
    }
    results.push(item);
  }

  const lastEdge = connection.edges[connection.edges.length - 1];
  return {
    results,
    hasNextPage: connection.pageInfo.hasNextPage,
    nextCursor: connection.pageInfo.hasNextPage && lastEdge ? lastEdge.cursor : null,
  };
}

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdminKeyValid = suppliedKey === ADMIN_KEY;
  const isCronSecretValid = Boolean(process.env.CRON_SECRET) && bearerToken === process.env.CRON_SECRET;

  if (!isAdminKeyValid && !isCronSecretValid) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const token = await fetchAccessToken();
    const mode = normalizeText(req.query.mode) || 'audit';
    const { installed, desired } = await getDesiredPublications(token);

    if (mode === 'audit') {
      const sheetBySku = await fetchSheetRows();
      const sample = await fetchProductBatch(token, { limit: 25, recent: true });
      res.statusCode = 200;
      res.end(JSON.stringify({
        installedPublications: installed.map((item) => item.name),
        desiredInstalledPublications: desired.map((item) => item.name),
        sheetProductCount: sheetBySku.size,
        sampleActiveProducts: sample.edges.map((edge) => ({
          sku: edge.node.variants.edges[0]?.node.sku || '',
          title: edge.node.title,
          status: edge.node.status,
          publicationsCount: edge.node.resourcePublicationsCount?.count ?? 0,
        })),
      }, null, 2));
      return;
    }

    if (mode === 'remove-redirect') {
      const theme = await removeBlanketStorefrontRedirect(token);
      res.statusCode = 200;
      res.end(JSON.stringify({ theme }, null, 2));
      return;
    }

    if (mode !== 'recent' && mode !== 'backfill') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'mode must be audit, remove-redirect, recent, or backfill.' }));
      return;
    }

    const theme = await removeBlanketStorefrontRedirect(token);
    const sheetBySku = await fetchSheetRows();
    const requestedLimit = Number.parseInt(String(req.query.limit || (mode === 'recent' ? '50' : '25')), 10);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 25, 1), 50);
    const cursor = mode === 'backfill' && typeof req.query.cursor === 'string' && req.query.cursor
      ? req.query.cursor
      : null;

    const batch = await processBatch(token, sheetBySku, desired, {
      cursor,
      limit,
      recent: mode === 'recent',
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      mode,
      theme,
      installedPublications: installed.map((item) => item.name),
      targetPublications: desired.map((item) => item.name),
      processed: batch.results.length,
      updated: batch.results.filter((item) => item.status === 'updated').length,
      errors: batch.results.filter((item) => item.status === 'error').length,
      hasNextPage: batch.hasNextPage,
      nextCursor: batch.nextCursor,
      results: batch.results,
    }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
}
