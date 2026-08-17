// Photomosaic mapping: slice the portrait into a cols x rows grid, sample
// each cell's average color, and match every cell to the product photo
// whose own average color is closest — so the assembled tile grid still
// reads as the portrait from a distance, and each tile is a real piece.

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    // Resolve with null rather than rejecting: the product catalog's real
    // photos are still being finalized, so a handful of missing files
    // shouldn't take down the whole mosaic. Cells just skip that product.
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// The sheet's "primary" filename for a product can be wrong (typo, stale
// extension, bulk-edit that doesn't match what's actually uploaded) --
// same situation the product cards already recover from via their own
// onError fallback chain. Without this, a bad primary filename here
// doesn't just lose one tile, it loses that product from the whole
// mosaic, and a systemic sheet mistake (every row's extension changed at
// once) can empty the grid entirely.
async function loadImageWithFallbacks(candidates) {
  for (const src of candidates) {
    if (!src) continue;
    const img = await loadImage(src);
    if (img) return img;
  }
  return null;
}

// Drawing a full-resolution image onto a tiny canvas makes the browser's
// own downscaling do the color-averaging for us: one destination pixel
// (via drawImage's resampling) is an approximation of that region's
// average color.
function sampleColorGrid(img, cols, rows) {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    cells.push([data[o], data[o + 1], data[o + 2]]);
  }
  return cells;
}

function distanceSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * @param {string} portraitSrc
 * @param {Array<{image: string}>} products
 * @param {number} cols
 * @param {number} rows
 * @returns {Promise<Array<{col:number, row:number, productIndex:number, color:[number,number,number]}>>}
 */
export async function buildMosaicGrid({ portraitSrc, products, cols, rows }) {
  if (!products.length) return [];

  const [portraitImg, ...productImgs] = await Promise.all([
    loadImage(portraitSrc),
    ...products.map((p) => loadImageWithFallbacks([p.image, ...(p.imageFallbacks || [])])),
  ]);

  if (!portraitImg) throw new Error(`Failed to load portrait image: ${portraitSrc}`);

  // Only products whose photo actually loaded can be sampled and shown.
  // `available` still points back at indexes in the original `products`
  // array so downstream product lookups (name, sku, price…) stay correct.
  const available = productImgs
    .map((img, productIndex) => ({ img, productIndex }))
    .filter((entry) => entry.img);

  if (available.length < products.length) {
    console.warn(
      `Living Mosaic: ${products.length - available.length} of ${products.length} product photos failed to load and were skipped.`
    );
  }
  if (!available.length) return [];

  const cellColors = sampleColorGrid(portraitImg, cols, rows);
  const productColors = available.map((entry) => sampleColorGrid(entry.img, 1, 1)[0]);
  // `entry.img.src` is whichever candidate actually loaded (primary or a
  // fallback) -- hand it back per productIndex so the tile renders that
  // same verified-working image instead of re-guessing with the product's
  // (possibly wrong) primary filename and silently 404ing.
  const resolvedSrcByIndex = new Map(available.map((entry) => [entry.productIndex, entry.img.src]));

  const grid = [];
  let aboveRowChoices = new Array(cols).fill(-1);

  for (let row = 0; row < rows; row++) {
    const thisRowChoices = new Array(cols).fill(-1);
    let leftChoice = -1;

    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const cellColor = cellColors[idx];

      const ranked = productColors
        .map((color, i) => ({ productIndex: available[i].productIndex, d: distanceSq(cellColor, color) }))
        .sort((a, b) => a.d - b.d);

      // With a small catalog, the literal nearest match repeats constantly
      // right next to itself. Prefer the runner-up when it's not a
      // meaningfully worse match, so the mosaic doesn't tile in obvious
      // 2x2 blocks. This gap closes naturally once the real catalog (100s
      // of SKUs) is wired in and neighboring cells rarely share a best match.
      let chosen = ranked[0];
      const above = aboveRowChoices[col];
      if (available.length > 3 && ranked[1]) {
        const collides = chosen.productIndex === leftChoice || chosen.productIndex === above;
        const runnerUpIsClose = ranked[1].d <= chosen.d * 1.6;
        if (collides && runnerUpIsClose) chosen = ranked[1];
      }

      thisRowChoices[col] = chosen.productIndex;
      leftChoice = chosen.productIndex;
      grid.push({
        col,
        row,
        productIndex: chosen.productIndex,
        color: cellColor,
        resolvedSrc: resolvedSrcByIndex.get(chosen.productIndex),
      });
    }

    aboveRowChoices = thisRowChoices;
  }

  return grid;
}

export function rgbToCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}
