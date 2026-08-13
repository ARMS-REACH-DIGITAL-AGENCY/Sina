import React, { useEffect, useMemo, useRef, useState } from 'react';
import useMosaicProducts from '../../hooks/useMosaicProducts.js';
import { buildMosaicGrid } from './colorMatch.js';
import MosaicTile from './MosaicTile.jsx';
import ProductModal from './ProductModal.jsx';
import MeetSinaPanel from './MeetSinaPanel.jsx';
import './living-mosaic.css';

// Portrait is 768x1360 (roughly 9:16). This grid shape keeps tiles square
// while the overall mosaic reads as the same portrait proportions.
const PORTRAIT_SRC = '/images/thomasina.jpg';
const GRID_COLS = 13;
const GRID_ROWS = 23;

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

  const sectionRef = useRef(null);

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

  return (
    <section className="living-mosaic" id="collection" ref={sectionRef}>
      <div className="living-mosaic__header">
        <span className="living-mosaic__eyebrow">Her Story &amp; Her Collection</span>
        <h2>A portrait built from the collection.</h2>
        <p>
          Every tile below is a real, one-of-one piece. Tap one to reveal its name. Tap it again to see the
          piece up close and adopt it. Together, they become her.
        </p>
        <div className="living-mosaic__actions">
          <button type="button" className="button primary" onClick={() => setMeetSinaOpen(true)}>
            Meet Sina
          </button>
          <button type="button" className="button ghost" onClick={revealAll}>
            Reveal All
          </button>
          <button type="button" className="button ghost" onClick={resetAll}>
            Reset Mosaic
          </button>
        </div>
      </div>

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
        )}
      </div>
      <p className="living-mosaic__caption">
        Tap a tile once to flip it &middot; tap the flipped tile again to view &amp; adopt the piece
      </p>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />}
      {meetSinaOpen && <MeetSinaPanel onClose={() => setMeetSinaOpen(false)} />}
    </section>
  );
}
