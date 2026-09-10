// Photomosaic mapping: slice the portrait into a cols x rows grid, sample
// each cell's average color, and match every cell to the product photo
// whose own average color is closest — so the assembled tile grid still
// reads as the portrait from a distance, and each tile is a real piece.

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    // Product photos now come from Shopify's CDN, not this site's own
    // origin -- sampleColorGrid() draws them onto a canvas and reads pixel
    // data back out, which the browser refuses (tainted canvas) unless the
    // image was fetched in CORS mode. Shopify's CDN already sends a
    // permissive Access-Control-Allow-Origin header, so this is enough.
    img.crossOrigin = 'anonymous';
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
  try {
    const { data } = ctx.getImageData(0, 0, cols, rows);
    const cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const o = i * 4;
      cells.push([data[o], data[o + 1], data[o + 2]]);
    }
    return cells;
  } catch (error) {
    // A cross-origin image without a permissive CORS response taints the
    // canvas and getImageData throws -- treat it the same as a failed
    // image load (null) rather than crashing the whole mosaic build.
    return null;
  }
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
    // A product's dedicated mosaicImage (uploaded in Shopify with alt text
    // "mosaic" -- see fetchShopifyImagesBySku in api/catalog.js) is a
    // tighter, purpose-cropped shot meant only for this grid, so it's tried
    // before the regular listing photo and its fallbacks.
    ...products.map((p) => loadImageWithFallbacks([p.mosaicImage, p.image, ...(p.imageFallbacks || [])])),
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
  if (!cellColors) throw new Error(`Failed to sample colors from portrait image: ${portraitSrc}`);

  // A loaded image can still fail color sampling (tainted canvas from a
  // cross-origin source without a permissive CORS response) -- filter those
  // out the same way a failed image load already is, rather than letting
  // one bad entry crash the whole grid.
  const sampled = available
    .map((entry) => ({ ...entry, color: sampleColorGrid(entry.img, 1, 1)?.[0] }))
    .filter((entry) => entry.color);

  if (sampled.length < available.length) {
    console.warn(
      `Living Mosaic: ${available.length - sampled.length} product photo(s) failed color sampling and were skipped.`
    );
  }
  if (!sampled.length) return [];

  const productColors = sampled.map((entry) => entry.color);
  // `entry.img.src` is whichever candidate actually loaded (primary or a
  // fallback) -- hand it back per productIndex so the tile renders that
  // same verified-working image instead of re-guessing with the product's
  // (possibly wrong) primary filename and silently 404ing.
  const resolvedSrcByIndex = new Map(sampled.map((entry) => [entry.productIndex, entry.img.src]));
  // A cell whose resolved image is the product's dedicated mosaicImage is
  // already a purpose-made tight crop -- the tile shouldn't also apply the
  // generic zoom-in-on-the-piece CSS transform meant for full listing
  // photos, or it'll crop an already-tight image too far.
  const isCustomCropByIndex = new Map(
    sampled.map((entry) => [entry.productIndex, Boolean(products[entry.productIndex]?.mosaicImage) && entry.img.src === products[entry.productIndex].mosaicImage])
  );

  const grid = [];
  // Only checking the cell to the left and the one directly above is not
  // enough. Across a large flat region of the portrait -- a lit forehead, a
  // plain shirt -- the same product is the nearest colour match for hundreds
  // of cells running, so a left/above test just alternates two products in a
  // checkerboard. That is what reads as "forced" up close.
  //
  // Instead, weigh a handful of near-enough matches per cell and pick the one
  // that is least repetitive: penalise a product that already sits within
  // REPEAT_RADIUS cells, and penalise one already used far more than its
  // fair share of the grid. Colour distance still dominates, so the portrait
  // still resolves -- these factors only decide between matches that are
  // already close in colour.
  const REPEAT_RADIUS = 3;
  const CANDIDATE_POOL = 14;
  const fairShare = (cols * rows) / Math.max(1, sampled.length);
  const usageByProduct = new Map();
  const placedByCell = new Array(cols * rows).fill(-1);

  function crowdingPenalty(col, row, productIndex) {
    let penalty = 0;
    for (let dr = -REPEAT_RADIUS; dr <= 0; dr++) {
      const r = row + dr;
      if (r < 0) continue;
      for (let dc = -REPEAT_RADIUS; dc <= REPEAT_RADIUS; dc++) {
        // Cells after this one in the current row aren't placed yet.
        if (dr === 0 && dc >= 0) continue;
        const c = col + dc;
        if (c < 0 || c >= cols) continue;
        if (placedByCell[r * cols + c] !== productIndex) continue;
        const ringDistance = Math.max(Math.abs(dr), Math.abs(dc));
        penalty += REPEAT_RADIUS + 1 - ringDistance;
      }
    }
    return penalty;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const cellColor = cellColors[idx];

      const ranked = productColors
        .map((color, i) => ({ productIndex: sampled[i].productIndex, d: distanceSq(cellColor, color) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, CANDIDATE_POOL);

      let chosen = ranked[0];
      if (sampled.length > 3 && ranked.length > 1) {
        let bestScore = Infinity;
        for (const candidate of ranked) {
          const used = usageByProduct.get(candidate.productIndex) || 0;
          const overuse = Math.max(0, used - fairShare) / Math.max(1, fairShare);
          const crowding = crowdingPenalty(col, row, candidate.productIndex);
          // +1 so an exact colour match can still be outweighed by crowding.
          const score = (candidate.d + 1) * (1 + 0.55 * crowding) * (1 + 0.35 * overuse);
          if (score < bestScore) {
            bestScore = score;
            chosen = candidate;
          }
        }
      }

      placedByCell[idx] = chosen.productIndex;
      usageByProduct.set(chosen.productIndex, (usageByProduct.get(chosen.productIndex) || 0) + 1);
      grid.push({
        col,
        row,
        productIndex: chosen.productIndex,
        color: cellColor,
        resolvedSrc: resolvedSrcByIndex.get(chosen.productIndex),
        isCustomCrop: isCustomCropByIndex.get(chosen.productIndex),
      });
    }
  }

  // Pure nearest-color assignment above can leave some products' colors
  // never winning a single cell, so the collage silently drops a chunk of
  // the catalog even though there are far more cells (thousands) than
  // products (hundreds). Give every successfully-loaded product at least
  // one placement: for each one that never got picked, hand it whichever
  // already-placed cell's color it matches best (that cell keeps its own
  // portrait-sampled `color`, so the swap only changes which photo fills
  // it, not the color it was chosen for).
  const usedProductIndexes = new Set(grid.map((cell) => cell.productIndex));
  const unusedEntries = sampled.filter((entry) => !usedProductIndexes.has(entry.productIndex));

  if (unusedEntries.length && grid.length) {
    const claimedCellIndexes = new Set();
    for (const entry of unusedEntries) {
      let bestCellIndex = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < grid.length; i++) {
        if (claimedCellIndexes.has(i)) continue;
        const d = distanceSq(entry.color, grid[i].color);
        if (d < bestDistance) {
          bestDistance = d;
          bestCellIndex = i;
        }
      }
      if (bestCellIndex === -1) break;
      claimedCellIndexes.add(bestCellIndex);
      grid[bestCellIndex] = {
        ...grid[bestCellIndex],
        productIndex: entry.productIndex,
        resolvedSrc: resolvedSrcByIndex.get(entry.productIndex),
        isCustomCrop: isCustomCropByIndex.get(entry.productIndex),
      };
    }
  }

  return grid;
}

export function rgbToCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}
