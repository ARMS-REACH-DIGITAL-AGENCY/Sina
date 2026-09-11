// Tell the Sheet when a piece sells.
//
// The Sheet is the source of truth for the catalog, but the sync only ever ran
// one way -- Sheet to Shopify. Nothing told the Sheet a piece had gone, so its
// "Variant Inventory Qty" column went stale the moment an order came in. A
// stale 1 looks exactly like a deliberate 1, which is how a sold piece got
// listed again with nothing to ship.
//
// The write goes through an Apps Script web app bound to the Sheet itself
// (scripts/sheet-writeback.gs), rather than a Google Cloud service account. It
// can only set that one column for a SKU it is given -- it cannot read rows
// back out or touch anything else, so the blast radius of the URL leaking is
// one column on one tab.

function writebackUrl() {
  return process.env.SHEET_WRITEBACK_URL || '';
}

function writebackSecret() {
  return process.env.SHEET_WRITEBACK_SECRET || '';
}

function isConfigured() {
  return Boolean(writebackUrl() && writebackSecret());
}

/**
 * Marks SKUs sold (or back in stock) in the Sheet.
 *
 * Never throws. This runs inside webhook handlers where the adoption record and
 * the customer's email matter more than the bookkeeping -- a Sheet that is
 * briefly out of date is recoverable, a webhook that 500s and retries for 48
 * hours is not. Callers get a result object and can log it.
 *
 * @param {string[]} skus
 * @param {number} [quantity] 0 to mark sold (default), 1 to restore
 * @returns {Promise<{ok: boolean, skipped?: string, error?: string, updated?: object[]}>}
 */
async function markSkusInSheet(skus, quantity = 0) {
  const list = (skus || []).map((sku) => String(sku).trim()).filter(Boolean);
  if (!list.length) return { ok: false, skipped: 'no skus' };
  if (!isConfigured()) return { ok: false, skipped: 'SHEET_WRITEBACK_URL/SECRET not set' };

  try {
    // Apps Script answers a POST with a 302 to script.googleusercontent.com;
    // fetch follows it by default, which is what returns the JSON body.
    const response = await fetch(writebackUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: writebackSecret(), skus: list, quantity }),
      redirect: 'follow',
    });

    const text = await response.text();
    if (!response.ok) return { ok: false, error: `Apps Script responded ${response.status}` };

    try {
      return JSON.parse(text);
    } catch (error) {
      // A Google login page instead of JSON means the deployment's access is
      // not set to "Anyone" -- the most likely way this is misconfigured.
      return { ok: false, error: 'Apps Script did not return JSON; check the deployment is set to "Anyone"' };
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = { markSkusInSheet, isConfigured };
