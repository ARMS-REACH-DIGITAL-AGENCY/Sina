import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useMosaicProducts from '../../hooks/useMosaicProducts.js';
import { buildMosaicGrid } from './colorMatch.js';
import MosaicTile from './MosaicTile.jsx';
import ProductModal from './ProductModal.jsx';
import MeetSinaPanel from './MeetSinaPanel.jsx';
import './living-mosaic.css';

// Real image asset already in the Sina repo history. This wider portrait gives
// the face more horizontal resolution than the previous 9:16 source.
const PORTRAIT_SRC = '/images/hero/thomasina-hero-full.jpg';
const GRID_COLS = 35;
const GRID_ROWS = 43; // 1,505 placements
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export default function LivingMosaic() {
  const { products, loading: productsLoading } = useMosaicProducts();
  const reducedMotion = usePrefersReducedMotion();

  const [grid, setGrid] = useState([]);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState(false);
  const [flipped, setFlipped] = useState(() => new Set());
  const [modalProduct, setModalProduct] = useState(null);
  const [meetSinaOpen, setMeetSinaOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [zoom, setZoom] = useState(1);

  const sectionRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (productsLoading || !products.length) return;
    let cancelled = false;
    setGridLoading(true);
    setGridError(false);
    buildMosaicGrid({ portraitSrc: PORTRAIT_SRC, products, cols: GRID_COLS, rows: GRID_ROWS })
      .then((result) => {
        if (!cancelled) {
          setGrid(result);
          setGridLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGridError(true);
          setGridLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [products, productsLoading]);

  const cellProduct = useMemo(() => {
    return (cell) => (cell ? products[cell.productIndex] : null);
  }, [products]);

  // At 1x we deliberately let the actual portrait help the human eye resolve
  // the larger image. As the shopper zooms in, the assist disappears and the
  // creations become fully opaque. This is an intentional optical transition,
  // not a permanent filter over the products.
  const zoomProgress = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  const portraitAssist = Math.max(0, 0.34 * (1 - zoomProgress));
  const tileImageOpacity = Math.min(1, 0.72 + zoomProgress * 0.28);

  function handleTap(cell) {
    const key = `${cell.col}-${cell.row}`;
    setFlipped((prev) => {
      if (prev.has(key)) {
        setModalProduct(cellProduct(cell));
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function revealAll() {
    setFlipped(new Set(grid.map((cell) => `${cell.col}-${cell.row}`)));
  }

  function resetAll() {
    setFlipped(new Set());
  }

  function changeZoom(nextZoom) {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    if (next === zoom) return;

    const viewport = viewportRef.current;
    const centerX = viewport && viewport.scrollWidth
      ? (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth
      : 0.5;
    const centerY = viewport && viewport.scrollHeight
      ? (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight
      : 0.5;

    setZoom(next);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const updated = viewportRef.current;
        if (!updated) return;
        updated.scrollLeft = centerX * updated.scrollWidth - updated.clientWidth / 2;
        updated.scrollTop = centerY * updated.scrollHeight - updated.clientHeight / 2;
      });
    });
  }

  function getCloser() {
    changeZoom(Math.max(2, zoom + ZOOM_STEP));
  }

  return (
    <section className="living-mosaic living-mosaic--hero" id="collection" ref={sectionRef}>
      <div className="living-mosaic__hero-shell">
        <div className="living-mosaic__visual">
          <div className="living-mosaic__frame">
            {(gridLoading || productsLoading) && (
              <div className="living-mosaic__loading" role="status">
                Assembling the mosaic&hellip;
              </div>
            )}
            {gridError && (
              <div className="living-mosaic__loading" role="status">
                The mosaic couldn&rsquo;t load right now. Please refresh to try again.
              </div>
            )}
            {!gridLoading && !gridError && !grid.length && (
              <div className="living-mosaic__loading" role="status">
                No product photos are available yet to build the mosaic.
              </div>
            )}
            {!gridLoading && !gridError && grid.length > 0 && (
              <div className="living-mosaic__viewport" ref={viewportRef}>
                <div
                  className="living-mosaic__zoom-stage"
                  style={{
                    width: `${zoom * 100}%`,
                    '--portrait-assist': portraitAssist,
                    '--tile-image-opacity': tileImageOpacity,
                  }}
                >
                  <div
                    className="living-mosaic__grid"
                    style={{ '--mosaic-cols': GRID_COLS, '--mosaic-rows': GRID_ROWS }}
                  >
                    {grid.map((cell) => {
                      const key = `${cell.col}-${cell.row}`;
                      return (
                        <MosaicTile
                          key={key}
                          cell={cell}
                          product={cellProduct(cell)}
                          flipped={flipped.has(key)}
                          active={active}
                          reducedMotion={reducedMotion}
                          onTap={handleTap}
                        />
                      );
                    })}
                  </div>
                  <img
                    className="living-mosaic__portrait-assist"
                    src={PORTRAIT_SRC}
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="living-mosaic__zoom-controls" aria-label="Mosaic zoom controls">
            <button type="button" onClick={() => changeZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out of mosaic" title="Step back">&minus;</button>
            <span>{zoom.toFixed(1)}&times;</span>
            <button type="button" onClick={() => changeZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom into mosaic" title="Get closer">+</button>
            <button type="button" className="living-mosaic__zoom-reset" onClick={() => changeZoom(1)}>Reset</button>
          </div>
          <p className="living-mosaic__microcopy">Step back to see Sina. Get closer to discover what she sees.</p>
        </div>

        <div className="living-mosaic__story">
          <span className="living-mosaic__eyebrow">One-of-one fused glass art</span>
          <h1>She sees what others miss.</h1>
          <p className="living-mosaic__lead">
            These are Sina&rsquo;s creations. Piece by piece, they become a portrait of the artist who made them.
          </p>
          <p>
            Thomasina experiences her work up close&mdash;finding color, texture, edges, and details most of us pass by. Try seeing it her way. Move closer. Explore the mosaic. You may be surprised by what you find.
          </p>
          <div className="living-mosaic__hero-actions">
            <button type="button" className="button primary" onClick={getCloser}>Get Closer</button>
            <Link className="button ghost" to="/shop">Adopt a Creation</Link>
            <button type="button" className="living-mosaic__story-link" onClick={() => setMeetSinaOpen(true)}>Meet Sina &rarr;</button>
          </div>
          <div className="living-mosaic__discovery-note">
            <strong>Look closely.</strong>
            <span>Tap a tile once to reveal its name. Tap it again to meet the creation.</span>
          </div>
        </div>
      </div>

      <div className="living-mosaic__secondary-actions">
        <button type="button" className="button ghost" onClick={revealAll}>Reveal All Names</button>
        <button type="button" className="button ghost" onClick={resetAll}>Reset Tiles</button>
      </div>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />}
      {meetSinaOpen && <MeetSinaPanel onClose={() => setMeetSinaOpen(false)} />}
    </section>
  );
}
