// Photomosaic mapping for the living portrait.
// The target portrait is cover-cropped without distortion. Product images are
// sampled one at a time so a phone never has to decode the entire catalog at
// once just to build the color map.

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(ctx, img, destWidth, destHeight, focalY = 0.42) {
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

  if (options.cover) drawCover(ctx, img, cols, rows, options.focalY);
  else ctx.drawImage(img, 0, 0, cols, rows);

  const { data } = ctx.getImageData(0, 0, cols, rows);
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    cells.push([data[o], data[o + 1], data[o + 2]]);
  }
  canvas.width = 1;
  canvas.height = 1;
  return cells;
}

async function sampleProductColors(products) {
  const available = [];
  for (let productIndex = 0; productIndex < products.length; productIndex++) {
    const img = await loadImage(products[productIndex].image);
    if (!img) continue;
    const color = sampleColorGrid(img, 1, 1)[0];
    available.push({ productIndex, color });
    // Give the browser a chance to release decoded image memory between files.
    if (productIndex % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return available;
}

function distanceSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

export async function buildMosaicGrid({ portraitSrc, products, cols, rows }) {
  if (!products.length) return [];

  const portraitImg = await loadImage(portraitSrc);
  if (!portraitImg) throw new Error(`Failed to load portrait image: ${portraitSrc}`);

  const cellColors = sampleColorGrid(portraitImg, cols, rows, { cover: true, focalY: 0.42 });
  const available = await sampleProductColors(products);

  if (available.length < products.length) {
    console.warn(`Living Mosaic: ${products.length - available.length} of ${products.length} product photos failed to load and were skipped.`);
  }
  if (!available.length) return [];

  const grid = [];
  let aboveRowChoices = new Array(cols).fill(-1);

  for (let row = 0; row < rows; row++) {
    const thisRowChoices = new Array(cols).fill(-1);
    let leftChoice = -1;

    for (let col = 0; col < cols; col++) {
      const cellColor = cellColors[row * cols + col];
      const ranked = available
        .map((entry) => ({ productIndex: entry.productIndex, d: distanceSq(cellColor, entry.color) }))
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
