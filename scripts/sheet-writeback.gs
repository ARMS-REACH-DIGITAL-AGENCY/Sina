/**
 * Sheet write-back — paste this into the catalog Sheet's Apps Script editor.
 *
 * The Sheet is the source of truth for the catalog, but nothing ever told it
 * when a piece sold. Its "Variant Inventory Qty" column went stale the moment
 * an order came in, and a stale 1 is indistinguishable from a deliberate one --
 * which is how a sold piece ended up back on sale.
 *
 * This closes that loop: Shopify sells a piece, the site calls this, the Sheet
 * goes to 0. It does exactly one thing and nothing else. It cannot read rows
 * back out, cannot change any other column, and cannot touch any other tab.
 *
 * SETUP (once)
 *   1. Open the catalog Sheet
 *   2. Extensions > Apps Script
 *   3. Delete whatever is there, paste this whole file, Save
 *   4. Deploy > New deployment > type "Web app"
 *        Execute as:        Me
 *        Who has access:    Anyone
 *      ("Anyone" is required — Shopify/Vercel can't log in as you. The SECRET
 *       below is what actually guards it; without a matching secret this
 *       returns unauthorized and changes nothing.)
 *   5. Copy the /exec URL it gives you and send it over
 */

// Must match SHEET_WRITEBACK_SECRET in the Vercel project.
var SECRET = 'uPxrxKHpcOkfASiMczGppW-o55JzQCee';

// The catalog tab, matched by its gid so renaming the tab can't break this.
// Same gid the site already reads from.
var SHEET_GID = 1901402257;

var SKU_HEADER = 'SKU';
var QTY_HEADER = 'Variant Inventory Qty';

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetByGid_(gid) {
  var sheets = SpreadsheetApp.getActive().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

/**
 * Headers aren't guaranteed to be on row 1 -- this Sheet has had banner rows
 * above them before. Scan the first few rows for the one that actually carries
 * both columns rather than assuming a position.
 */
function findHeader_(sheet) {
  var probe = sheet.getRange(1, 1, Math.min(6, sheet.getLastRow()), sheet.getLastColumn()).getValues();
  for (var r = 0; r < probe.length; r++) {
    var row = probe[r];
    var skuCol = -1;
    var qtyCol = -1;
    for (var c = 0; c < row.length; c++) {
      var cell = String(row[c]).trim();
      if (cell === SKU_HEADER) skuCol = c + 1;
      if (cell === QTY_HEADER) qtyCol = c + 1;
    }
    if (skuCol > 0 && qtyCol > 0) {
      return { row: r + 1, skuCol: skuCol, qtyCol: qtyCol };
    }
  }
  return null;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'no body' });
    }

    var body = JSON.parse(e.postData.contents);
    if (String(body.secret || '') !== SECRET) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var skus = body.skus;
    if (!skus || !skus.length) return json_({ ok: false, error: 'no skus' });

    // Only ever 0 or 1. This exists to mark pieces sold, not as a general
    // remote-write into the catalog.
    var qty = body.quantity === 1 ? 1 : 0;

    var sheet = sheetByGid_(SHEET_GID);
    if (!sheet) return json_({ ok: false, error: 'sheet gid ' + SHEET_GID + ' not found' });

    var header = findHeader_(sheet);
    if (!header) return json_({ ok: false, error: 'could not find SKU / qty headers' });

    var firstDataRow = header.row + 1;
    var rowCount = sheet.getLastRow() - header.row;
    if (rowCount < 1) return json_({ ok: false, error: 'no data rows' });

    var skuValues = sheet.getRange(firstDataRow, header.skuCol, rowCount, 1).getValues();

    var wanted = {};
    for (var i = 0; i < skus.length; i++) {
      wanted[String(skus[i]).trim().toUpperCase()] = true;
    }

    var updated = [];
    var missing = {};
    for (var k in wanted) missing[k] = true;

    for (var r = 0; r < skuValues.length; r++) {
      var sku = String(skuValues[r][0]).trim().toUpperCase();
      if (!sku || !wanted[sku]) continue;

      var cell = sheet.getRange(firstDataRow + r, header.qtyCol);
      if (Number(cell.getValue()) !== qty) {
        cell.setValue(qty);
        updated.push({ sku: sku, row: firstDataRow + r });
      }
      delete missing[sku];
    }

    return json_({
      ok: true,
      quantity: qty,
      updated: updated,
      alreadyCorrect: skus.length - updated.length - Object.keys(missing).length,
      notFound: Object.keys(missing)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Lets you confirm the deployment is alive without changing anything. */
function doGet() {
  return json_({ ok: true, service: 'sina-sheet-writeback' });
}
