// Photomosaic mapping: sample the target portrait into a grid and match each
// cell to the real product photo whose average color is closest. Portrait
// sampling uses a cover crop so the source image is never stretched to fit the
// mosaic's aspect ratio.

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(ctx, img, destWidth, destHeight, focalY = 0.34) {
  const targetAspect = destWidth / destHeight;
  const sourceAspect = img.width / img.height;

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (sourceAspect > targetAspect) {
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
  } else if (sourceAspect < targetAspect) {
    sh = img.width / targetAspect;
    const maxSy = img.height - sh;
    sy = Math.max(0, Math.min(maxSy, maxSy * focalY));
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destWidth, destHeight);
}

function sampleColorGrid(img, cols, rows, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (options.cover) {
    drawCover(ctx, img, cols, rows, options.focalY);
  } else {
    ctx.drawImage(img, 0, 0, cols, rows);
  }

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
    ...products.map((p) => loadImage(p.image)),
  ]);

  if (!portraitImg) throw new Error(`Failed to load portrait image: ${portraitSrc}`);

  const available = productImgs
    .map((img, productIndex) => ({ img, productIndex }))
    .filter((entry) => entry.img);

  if (available.length < products.length) {
    console.warn(
      `Living Mosaic: ${products.length - available.length} of ${products.length} product photos failed to load and were skipped.`
    );
  }
  if (!available.length) return [];

  // The target portrait is cover-cropped, never distorted. A slightly upper
  // focal point keeps the face where the hero composition needs it.
  const cellColors = sampleColorGrid(portraitImg, cols, rows, { cover: true, focalY: 0.34 });
  const productColors = available.map((entry) => sampleColorGrid(entry.img, 1, 1)[0]);

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

      let chosen = ranked[0];
      const above = aboveRowChoices[col];
      if (available.length > 3 && ranked[1]) {
        const collides = chosen.productIndex === leftChoice || chosen.productIndex === above;
        const runnerUpIsClose = ranked[1].d <= chosen.d * 1.6;
        if (collides && runnerUpIsClose) chosen = ranked[1];
      }

      thisRowChoices[col] = chosen.productIndex;
      leftChoice = chosen.productIndex;
      grid.push({ col, row, productIndex: chosen.productIndex, color: cellColor });
    }

    aboveRowChoices = thisRowChoices;
  }

  return grid;
}

export function rgbToCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}
