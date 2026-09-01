import { SHEET_CSV_URL } from '../lib/sina-config.mjs';
const SHOPIFY_API_VERSION = '2024-10';

const CATEGORY_MAP = {
  Pendants: 'Pendants',
  'Wire Wrapped': 'Wire Wrapped',
  Necklaces: 'Necklaces',
  'Ocean Necklaces': 'Ocean Necklaces',
  Plates: 'Plates',
  Plaques: 'Plaques',
  'Wall Art': 'Plaques',
  Charms: 'Charms',
  Sets: 'Sets',
  Lanyards: 'Lanyards',
};

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.send(JSON.stringify(body));
}

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
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
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

function stripHtml(value) {
  return normalizeText(
    String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&ldquo;/gi, '"')
      .replace(/&rdquo;/gi, '"')
      .replace(/&mdash;/gi, '—')
      .replace(/&ndash;/gi, '-')
      .replace(/\[\[SIZE_TBD\]\]/gi, ' ')
      .replace(/\s+/g, ' ')
  );
}

function extractHeadline(bodyHtml) {
  const match = String(bodyHtml || '').match(/<strong>(.*?)<\/strong>/i);
  if (match) {
    return stripHtml(match[1]);
  }

  const text = stripHtml(bodyHtml);
  return text.split('. ')[0] || text;
}

function normalizeCategory(row) {
  // Type used to be read here too as a fallback, but it's actually a
  // freeform keyword-tag column (e.g. "small, ocean, wire wrapped") rather
  // than a category name -- Collection is the real source of truth.
  const rawCategory = normalizeText(row.Collection);
  return CATEGORY_MAP[rawCategory] || rawCategory || 'Creations';
}

// Vercel serves /public as a case-sensitive filesystem, so a filename's
// extension has to match the real uploaded file exactly -- but nobody
// filling in a spreadsheet is going to remember whether a given photo was
// uploaded as .JPG, .jpg, .png, etc. Rather than force one convention (the
// old code always assumed .JPG when no extension was typed, which is why
// anything uploaded as .png/.jpeg silently failed), try every common
// extension/case combo and let the frontend fall through to whichever one
// actually exists. Whatever extension *was* typed still goes first, since
// it's the most likely to be right.
const EXTENSION_CANDIDATES = ['JPG', 'jpg', 'jpeg', 'JPEG', 'png', 'PNG'];

function buildExtensionCandidates(rawFilename) {
  const match = rawFilename.match(/^(.*)\.([a-z0-9]+)$/i);
  const base = match ? match[1] : rawFilename;
  const typedExt = match ? match[2] : null;

  const orderedExtensions = typedExt
    ? [typedExt, ...EXTENSION_CANDIDATES.filter((ext) => ext.toLowerCase() !== typedExt.toLowerCase())]
    : EXTENSION_CANDIDATES;

  return [...new Set(orderedExtensions)].map((ext) => `/images/products/${base}.${ext}`);
}

// Images now live in Shopify -- editing a photo there (via Photoroom's
// Shopify integration, or by hand) shows up on the site automatically, with
// no GitHub commit and no filename to remember. This looks products up by
// SKU in one bulk paginated query rather than one request per product, and
// is designed to fail soft: any Shopify hiccup (missing creds, network
// error, a SKU that was never synced) falls through to the repo-hosted
// image logic below instead of breaking the storefront.
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

// Returns a Map<SKU, {urls, mosaicUrl, status, availableForSale}> -- Shopify's
// own media order is the gallery order, first image is the featured one, so
// no extra ordering logic is needed once the data is in hand. mosaicUrl is
// whichever image (if any) on that product has its alt text set to
// "mosaic" -- a way to upload a tighter, background-free crop specifically
// for the Living Mosaic's tiles without disturbing the listing photos
// everywhere else on the site (see buildMosaicGrid in colorMatch.js, which
// prefers this over the regular listing image when it's present). status
// and availableForSale are Shopify's live "has this actually sold" signal
// -- Shopify auto-archives a product when its inventory hits zero (and
// un-archives it on a refund), so this is more trustworthy than the
// Sheet's Variant Inventory Qty column, which the owner never touches
// again after a piece is first listed (see normalizeStatus below).
async function fetchShopifyImagesBySku() {
  const domain = shopifyDomain();
  const images = new Map();

  try {
    const token = await getShopifyToken();
    if (!domain || !token) return images;

    let cursor = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
        body: JSON.stringify({
          query: `query($cursor: String) {
            products(first: 250, after: $cursor, query: "tag:sheet-sync") {
              edges {
                cursor
                node {
                  status
                  variants(first: 1) { edges { node { sku availableForSale } } }
                  media(first: 10) {
                    edges { node { ... on MediaImage { image { url altText } } } }
                  }
                }
              }
              pageInfo { hasNextPage }
            }
          }`,
          variables: { cursor },
        }),
      });

      const payload = await response.json();
      if (payload.errors) break;

      const edges = payload.data?.products?.edges || [];
      for (const edge of edges) {
        const variant = edge.node.variants.edges[0]?.node;
        const sku = variant?.sku?.trim().toUpperCase();
        if (!sku) continue;
        const mediaImages = edge.node.media.edges.map((m) => m.node.image).filter(Boolean);
        const urls = mediaImages.map((img) => img.url).filter(Boolean);
        const mosaicUrl = mediaImages.find((img) => normalizeText(img.altText).toLowerCase() === 'mosaic')?.url || null;
        if (urls.length) {
          images.set(sku, {
            urls,
            mosaicUrl,
            status: edge.node.status,
            availableForSale: Boolean(variant?.availableForSale),
          });
        }
      }

      if (!payload.data?.products?.pageInfo?.hasNextPage || edges.length === 0) break;
      cursor = edges[edges.length - 1].cursor;
    }
  } catch (error) {
    return new Map();
  }

  return images;
}

// Returns every plausible image path for this row, most-trusted first, so
// the client can fall back if the "correct" one turns out to be wrong --
// e.g. a row's Image 1 Filename column says "NKL-166" but the file
// actually uploaded is "166.JPG" (the legacy shoot-number convention every
// other row uses). Rather than silently show a broken image whenever a
// sheet entry has a filename typo/mismatch, give the frontend both
// candidates and let it try the second if the first 404s.
function buildImageCandidates(row) {
  const candidates = [];

  // Image 1 Filename is the primary shot under the clean 1/2/3/4 gallery
  // scheme. Final Image Filename is the old column being retired -- kept
  // here only as a fallback so nothing breaks for any row that hasn't been
  // migrated yet; safe to remove once every row has Image 1 Filename set.
  const primaryFilename = normalizeText(row['Image 1 Filename']) || normalizeText(row['Final Image Filename']);
  if (primaryFilename) {
    candidates.push(...buildExtensionCandidates(primaryFilename));
  }

  const legacySku = normalizeText(row.SKU);
  if (legacySku) {
    const lastSegment = legacySku.split('-').filter(Boolean).pop();
    if (lastSegment) {
      candidates.push(...buildExtensionCandidates(lastSegment));
    }
  }

  const legacyImageId = normalizeText(row['Legacy Image ID']);
  if (legacyImageId) {
    candidates.push(...buildExtensionCandidates(legacyImageId));
  }

  candidates.push('/images/thomasina.jpg');

  return [...new Set(candidates)];
}

// Extra gallery photos beyond the primary shot -- filled in only for pieces
// where there's more than one angle worth showing. Optional columns, so
// most rows simply won't have them and the card falls back to just the
// primary image. Each slot carries its own extension-candidate chain (same
// case-mismatch tolerance as the primary photo) so the frontend can fall
// through per-thumbnail instead of giving up on the whole gallery.
function buildGalleryImages(row, primaryImageCandidates) {
  const extraSlots = ['Image 2 Filename', 'Image 3 Filename', 'Image 4 Filename']
    .map((key) => normalizeText(row[key]))
    .filter(Boolean)
    .map((filename) => buildExtensionCandidates(filename));

  return [primaryImageCandidates, ...extraSlots];
}

function normalizeSku(row) {
  const resolvedSku = normalizeText(row.SKU)
    || normalizeText(row['Variant SKU'])
    || normalizeText(row['Final SKU']);

  return resolvedSku.toUpperCase();
}

function normalizePrice(value) {
  const parsed = Number.parseFloat(normalizeText(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Prefers Shopify's own live status when this SKU exists there -- Shopify
// auto-archives a product when its inventory hits zero (and un-archives it
// automatically on a refund/return), so that's a real live signal. The
// Sheet's Variant Inventory Qty column only means "ready to list" in the
// owner's workflow (0/empty = not ready, 1 = go) and is never touched
// again after a piece is first created in Shopify, so it's only trustworthy
// as a *pre-creation* fallback, not an ongoing sold/available signal.
function normalizeStatus(row, shopifyEntry) {
  if (shopifyEntry) {
    const soldOut = shopifyEntry.status === 'ARCHIVED' || shopifyEntry.availableForSale === false;
    return soldOut ? 'sold-out' : 'available';
  }

  const qty = Number.parseInt(normalizeText(row['Variant Inventory Qty']), 10);
  if (Number.isFinite(qty) && qty <= 0) {
    return 'sold-out';
  }

  return 'available';
}

function normalizeDimension(value) {
  const parsed = Number.parseFloat(normalizeText(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readDimension(row, ...keys) {
  for (const key of keys) {
    const parsed = normalizeDimension(row[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function normalizeProduct(row, shopifyImages) {
  const bodyHtml = normalizeText(row['Body (HTML)']);
  const description = stripHtml(bodyHtml);
  const sku = normalizeSku(row);

  // Shopify is the live source for photos now -- an edit made there (via
  // Photoroom or by hand) shows up here with nothing else to touch. Only
  // fall back to guessing a repo-hosted filename when this SKU has no
  // Shopify images yet (never synced, or Shopify was unreachable).
  const shopifyEntry = shopifyImages.get(sku);
  const shopifyUrls = shopifyEntry?.urls;
  let image;
  let imageFallbacks;
  let gallery;

  if (shopifyUrls && shopifyUrls.length) {
    [image, ...imageFallbacks] = shopifyUrls;
    gallery = shopifyUrls.map((url) => [url]);
  } else {
    const imageCandidates = buildImageCandidates(row);
    [image, ...imageFallbacks] = imageCandidates;
    gallery = buildGalleryImages(row, imageCandidates);
  }

  return {
    sku,
    name: normalizeText(row.Title),
    category: normalizeCategory(row),
    price: normalizePrice(row['Variant Price']),
    image,
    imageFallbacks,
    gallery,
    mosaicImage: shopifyEntry?.mosaicUrl || null,
    line: extractHeadline(bodyHtml) || 'One of one. Handcrafted by Thomasina Schnepf.',
    description,
    descriptionHtml: bodyHtml,
    height: readDimension(row, 'H', 'Height'),
    width: readDimension(row, 'W', 'Width'),
    weight: readDimension(row, 'oz.', 'oz', 'Oz.', 'Oz', 'Weight'),
    type: normalizeText(row.Type),
    // Size is a separate, structured Sheet column (small / medium / large).
    // Keep Type as its existing freeform descriptor for compatibility.
    size: normalizeText(row.Size),
    tags: normalizeText(row.Tags),
    colors: normalizeText(row.Colors),
    // Colors holds hex codes for the mosaic's own color-matching math --
    // "Human Colors" is the plain-English column ("Silver, Dark Blue",
    // "Hot Pink") that's actually searchable by a person typing a color.
    colorNames: normalizeText(row['Human Colors']),
    shopifyUrl: normalizeText(row['Shopify Product URL']),
    status: normalizeStatus(row, shopifyEntry),
    // A "Featured" column in the sheet lets Featured Pieces on the home page
    // be managed by marking a cell, not by editing FEATURED_SKUS in code
    // every time a featured piece sells and drops out of the published rows.
    // Accepts a real Sheets checkbox (TRUE) or just typing a mark in the
    // cell (x, yes, y, 1) -- whatever's fastest for whoever's filling it in.
    featured: /^(true|x|yes|y|1)$/i.test(normalizeText(row.Featured)),
  };
}

function dedupeProducts(products) {
  const seen = new Set();
  const deduped = [];

  for (const product of products) {
    if (!product.sku || seen.has(product.sku)) {
      continue;
    }

    seen.add(product.sku);
    deduped.push(product);
  }

  return deduped;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const [response, shopifyImages] = await Promise.all([
      fetch(SHEET_CSV_URL, {
        headers: {
          Accept: 'text/csv',
        },
      }),
      fetchShopifyImagesBySku(),
    ]);

    if (!response.ok) {
      throw new Error(`Google Sheet returned ${response.status}`);
    }

    const csvText = await response.text();
    const [header = [], ...rows] = parseCsv(csvText);
    const keys = header.map((value, index) => normalizeText(value) || `__col_${index}`);

    const mappedRows = rows
      .filter((row) => row.some((cell) => normalizeText(cell)))
      .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ''])));

    const products = dedupeProducts(
      mappedRows
        .filter((row) => normalizeText(row.Published).toUpperCase() === 'TRUE')
        .filter((row) => normalizeSku(row) && normalizeText(row.Title))
        .map((row) => normalizeProduct(row, shopifyImages))
    );

    return sendJson(res, 200, {
      source: 'google-sheet',
      products,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'Unable to load the live Sina catalog right now.',
      detail: error.message,
    });
  }
}
