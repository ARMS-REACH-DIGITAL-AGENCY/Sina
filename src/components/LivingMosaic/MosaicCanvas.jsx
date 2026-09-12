import { useEffect, useRef } from 'react';

const MAX_CONCURRENT_IMAGE_LOADS = 3;
const MAX_DEVICE_PIXEL_RATIO = 1.5;

function getSource(cell, products) {
  const product = products[cell.productIndex];

  return (
    cell.resolvedSrc ||
    product?.mosaicImage ||
    product?.image ||
    product?.imageFallbacks?.[0] ||
    ''
  );
}

function loadImage(source) {
  return new Promise((resolve) => {
    if (!source) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function drawCover(context, image, x, y, width, height) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) return;

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

export default function MosaicCanvas({ cells, products, cols, rows, onReady, onTap }) {
  const canvasRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const onTapRef = useRef(onTap);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cells.length || !cols || !rows) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let cancelled = false;
    let logicalWidth = 1;
    let logicalHeight = 1;

    const cellsBySource = new Map();
    cells.forEach((cell) => {
      const source = getSource(cell, products);
      if (!source) return;

      const matchingCells = cellsBySource.get(source) || [];
      matchingCells.push(cell);
      cellsBySource.set(source, matchingCells);
    });

    const initialSources = [...cellsBySource.entries()]
      .filter(([, matchingCells]) => matchingCells.some((cell) => cell.isInitialPreview))
      .map(([source]) => source);
    const sources = [
      ...initialSources,
      ...[...cellsBySource.keys()].filter((source) => !initialSources.includes(source)),
    ];
    const images = new Map();

    function drawCellSet(image, matchingCells) {
      const cellWidth = logicalWidth / cols;
      const cellHeight = logicalHeight / rows;

      matchingCells.forEach((cell) => {
        drawCover(
          context,
          image,
          cell.col * cellWidth,
          cell.row * cellHeight,
          cellWidth,
          cellHeight,
        );
      });
    }

    function drawAll() {
      context.fillStyle = '#11110f';
      context.fillRect(0, 0, logicalWidth, logicalHeight);

      images.forEach((image, source) => {
        drawCellSet(image, cellsBySource.get(source) || []);
      });
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      logicalWidth = Math.max(1, bounds.width);
      logicalHeight = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);

      canvas.width = Math.round(logicalWidth * ratio);
      canvas.height = Math.round(logicalHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawAll();
    }

    resize();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);

    let nextSource = 0;
    let completedInitial = 0;
    let readySent = initialSources.length === 0;

    if (readySent) onReadyRef.current?.();

    function completeInitial() {
      completedInitial += 1;
      if (!readySent && completedInitial >= initialSources.length) {
        readySent = true;
        onReadyRef.current?.();
      }
    }

    async function worker() {
      while (!cancelled) {
        const sourceIndex = nextSource;
        nextSource += 1;
        if (sourceIndex >= sources.length) return;

        const source = sources[sourceIndex];
        const image = await loadImage(source);
        if (cancelled) return;

        if (image) {
          images.set(source, image);
          drawCellSet(image, cellsBySource.get(source) || []);
        }

        if (sourceIndex < initialSources.length) completeInitial();
      }
    }

    void Promise.all(
      Array.from(
        { length: Math.min(MAX_CONCURRENT_IMAGE_LOADS, sources.length) },
        () => worker(),
      ),
    );

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [cells, products, cols, rows]);

  function handleClick(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const column = Math.max(
      0,
      Math.min(cols - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * cols)),
    );
    const row = Math.max(
      0,
      Math.min(rows - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * rows)),
    );
    const cell = cells.find((candidate) => candidate.col === column && candidate.row === row);

    if (cell) onTapRef.current?.(cell);
  }

  return (
    <canvas
      ref={canvasRef}
      className="living-mosaic__canvas"
      onClick={handleClick}
      aria-label="Interactive mosaic of Sina's Creations"
    />
  );
}
