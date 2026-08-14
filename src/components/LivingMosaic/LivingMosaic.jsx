import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useMosaicProducts from '../../hooks/useMosaicProducts.js';
import { buildMosaicGrid } from './colorMatch.js';
import MosaicTile from './MosaicTile.jsx';
import ProductModal from './ProductModal.jsx';
import MeetSinaPanel from './MeetSinaPanel.jsx';
import './living-mosaic.css';
import './mosaic-experiment-overrides.css';

// Claude's working matcher and 29x51 grid stay unchanged for Gate 1.
const PORTRAIT_SRC = '/images/hero/PLQ-FG-LG-45.JPG';
const GRID_COLS = 29;
const GRID_ROWS = 51;

export default function LivingMosaic() {
  const { products, loading: productsLoading } = useMosaicProducts();

  const [grid, setGrid] = useState([]);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState(false);
  const [portraitLoaded, setPortraitLoaded] = useState(false);
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

  const mosaicReady = portraitLoaded && !productsLoading && !gridLoading && !gridError && grid.length > 0;

  function handleTap(cell) {
    setModalProduct(cellProduct(cell));
  }

  return (
    <section className="living-mosaic living-mosaic--hero" id="collection" ref={sectionRef}>
      <div className="living-mosaic__hero-shell">
        <div className="living-mosaic__story">
          <span className="living-mosaic__eyebrow">Her Story. Her Creations. Your Choice.</span>
          <h1>The closer you get, the more you see.</h1>
          <p className="living-mosaic__story-copy">Every named creation carries a piece of Sina&rsquo;s vision &mdash; glass, light, color, texture, and touch shaped into something that will never exist again.</p>
          <p className="living-mosaic__story-copy">Some are worn. Some are displayed. Some are gifted. All are made by hand and released only once.</p>
          <p className="living-mosaic__lead">Step back to see this amazing legally blind artist.</p>
          <p className="living-mosaic__lead">Come closer to meet her 1-of-1 creations.</p>
          <div className="living-mosaic__hero-actions">
            <Link className="button primary" to="/shop">Adopt the one that finds you.</Link>
            <button type="button" className="button ghost" onClick={() => setMeetSinaOpen(true)}>Meet Sina</button>
          </div>
        </div>

        <div className="living-mosaic__visual">
          <div className={`living-mosaic__frame${mosaicReady ? ' is-mosaic-ready' : ''}`}>
            <div className="living-mosaic__grid-reveal" aria-hidden={!mosaicReady}>
              {!gridError && grid.length > 0 && (
                <div className="living-mosaic__grid" style={{ '--mosaic-cols': GRID_COLS, '--mosaic-rows': GRID_ROWS }}>
                  {grid.map((cell) => {
                    const key = `${cell.col}-${cell.row}`;
                    return (
                      <MosaicTile
                        key={key}
                        cell={cell}
                        product={cellProduct(cell)}
                        active={active}
                        onTap={handleTap}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <img
              className="living-mosaic__portrait-reveal"
              src={PORTRAIT_SRC}
              alt="Thomasina Schnepf holding one of her fused-glass creations"
              onLoad={() => setPortraitLoaded(true)}
            />

            <div className="living-mosaic__sr-status" role="status" aria-live="polite">
              {gridError
                ? 'The portrait is visible. The mosaic could not be assembled right now.'
                : mosaicReady
                  ? 'The mosaic is ready. Tap a creation to view its details.'
                  : 'The portrait is visible while the mosaic is being assembled.'}
            </div>
          </div>

          <div className="living-mosaic__visual-footer">
            <p className="living-mosaic__caption">Step back to see Sina. Come closer to meet the creations.</p>
          </div>
        </div>
      </div>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />}
      {meetSinaOpen && <MeetSinaPanel onClose={() => setMeetSinaOpen(false)} />}
    </section>
  );
}
