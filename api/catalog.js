const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1yTKJUw-OjpI6V2wxUtfSVq61b3NV3g9EcaZxsUEbfBY/export?format=csv&gid=1901402257';

const CATEGORY_MAP = {
  Pendants: 'Pendants',
  'Wire Wrapped': 'Wire Wrapped',
  Necklaces: 'Necklaces',
  'Ocean Necklaces': 'Ocean Necklaces',
  Plates: 'Plates',
  Plaques: 'Wall Art',
  'Wall Art': 'Wall Art',
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
  const rawCategory = normalizeText(row.Collection) || normalizeText(row.Type);
  return CATEGORY_MAP[rawCategory] || rawCategory || 'Creations';
}

function ensureImageExtension(value) {
  return /\.[a-z0-9]+$/i.test(value) ? value : `${value}.JPG`;
}

// Returns every plausible image path for this row, most-trusted first, so
// the client can fall back if the "correct" one turns out to be wrong --
// e.g. a row's Final Image Filename column says "NKL-166" but the file
// actually uploaded is "166.JPG" (the legacy shoot-number convention every
// other row uses). Rather than silently show a broken image whenever a
// sheet entry has a filename typo/mismatch, give the frontend both
// candidates and let it try the second if the first 404s.
function buildImageCandidates(row) {
  const candidates = [];

  const finalFilename = normalizeText(row['Final Image Filename']);
  if (finalFilename) {
    candidates.push(`/images/products/${ensureImageExtension(finalFilename)}`);
  }

  const legacySku = normalizeText(row.SKU);
  if (legacySku) {
    const lastSegment = legacySku.split('-').filter(Boolean).pop();
    if (lastSegment) {
      candidates.push(`/images/products/${ensureImageExtension(lastSegment)}`);
    }
  }

  const legacyImageId = normalizeText(row['Legacy Image ID']);
  if (legacyImageId) {
    candidates.push(`/images/products/${ensureImageExtension(legacyImageId)}`);
  }

  candidates.push('/images/thomasina.jpg');

  return [...new Set(candidates)];
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

function normalizeStatus(row) {
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

function normalizeProduct(row) {
  const bodyHtml = normalizeText(row['Body (HTML)']);
  const description = stripHtml(bodyHtml);
  const [image, ...imageFallbacks] = buildImageCandidates(row);

  return {
    sku: normalizeSku(row),
    name: normalizeText(row.Title),
    category: normalizeCategory(row),
    price: normalizePrice(row['Variant Price']),
    image,
    imageFallbacks,
    line: extractHeadline(bodyHtml) || 'One of one. Handcrafted by Thomasina Schnepf.',
    description,
    descriptionHtml: bodyHtml,
    height: readDimension(row, 'H', 'Height'),
    width: readDimension(row, 'W', 'Width'),
    weight: readDimension(row, 'oz.', 'oz', 'Oz.', 'Oz', 'Weight'),
    tags: normalizeText(row.Tags),
    colors: normalizeText(row.Colors),
    shopifyUrl: normalizeText(row['Shopify Product URL']),
    status: normalizeStatus(row),
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
    const response = await fetch(SHEET_CSV_URL, {
      headers: {
        Accept: 'text/csv',
      },
    });

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
        .map(normalizeProduct)
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
