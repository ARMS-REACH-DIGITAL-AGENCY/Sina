import { SHEET_CSV_URL, isAdminKeyValid as validateAdminKey } from '../lib/sina-config.mjs';
// One-off admin endpoint: returns raw Sheet rows (every column, unfiltered by
// Published) for a given list of SKUs, so a duplicate-SKU investigation can
// inspect the actual sheet contents without pulling the whole ~300-row CSV
// through the calling agent's context. Gated by the same admin key pattern
// as the other one-off endpoints in this file. Delete once the investigation
// is done.

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

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (!validateAdminKey(suppliedKey)) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const response = await fetch(SHEET_CSV_URL, { headers: { Accept: 'text/csv' } });
    if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`);
    const csvText = await response.text();
    const [header = [], ...rows] = parseCsv(csvText);
    const keys = header.map((value, index) => normalizeText(value) || `__col_${index}`);

    const mappedRows = rows
      .filter((row) => row.some((cell) => normalizeText(cell)))
      .map((row, index) => ({ __rowNumber: index + 2, ...Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ''])) }));

    if (req.query.mode === 'dupes') {
      // Find every SKU value that appears on more than one row at all.
      const bySku = new Map();
      for (const row of mappedRows) {
        const sku = normalizeSku(row);
        if (!sku) continue;
        if (!bySku.has(sku)) bySku.set(sku, []);
        bySku.get(sku).push(row);
      }
      const dupes = [...bySku.entries()]
        .filter(([, rowsForSku]) => rowsForSku.length > 1)
        .map(([sku, rowsForSku]) => ({
          sku,
          count: rowsForSku.length,
          rows: rowsForSku.map((r) => ({
            rowNumber: r.__rowNumber,
            title: normalizeText(r.Title),
            published: normalizeText(r.Published),
            image1: normalizeText(r['Image 1 Filename']),
          })),
        }));
      res.statusCode = 200;
      res.end(JSON.stringify({ totalRows: mappedRows.length, duplicateSkuCount: dupes.length, dupes }, null, 2));
      return;
    }

    if (req.query.mode === 'all-titles') {
      const all = mappedRows
        .filter((row) => normalizeText(row.Published).toUpperCase() === 'TRUE')
        .map((row) => ({
          sku: normalizeSku(row),
          title: normalizeText(row.Title),
          category: normalizeText(row.Collection) || normalizeText(row.Type),
          price: normalizeText(row['Variant Price']),
          rowNumber: row.__rowNumber,
        }))
        .filter((row) => row.sku && row.title);
      res.statusCode = 200;
      res.end(JSON.stringify({ totalRows: mappedRows.length, count: all.length, rows: all }, null, 2));
      return;
    }

    const wantedSkus = new Set(
      (typeof req.query.skus === 'string' ? req.query.skus.split(',') : []).map((s) => s.trim().toUpperCase()).filter(Boolean)
    );

    const matched = mappedRows.filter((row) => wantedSkus.has(normalizeSku(row)));

    res.statusCode = 200;
    res.end(JSON.stringify({ totalRows: mappedRows.length, matchedCount: matched.length, rows: matched }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
