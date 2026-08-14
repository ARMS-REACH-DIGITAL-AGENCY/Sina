import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useMosaicProducts from '../../hooks/useMosaicProducts.js';
import { buildMosaicGrid } from './colorMatch.js';
import MosaicTile from './MosaicTile.jsx';
import ProductModal from './ProductModal.jsx';
import './living-mosaic.css';
import './mosaic-experiment-overrides.css';

// Claude's working matcher and 29x51 grid stay unchanged.
const PORTRAIT_SRC = '/images/hero/PLQ-FG-LG-45.JPG';
const GRID_COLS = 29;
const GRID_ROWS = 51;

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
  const [portraitLoaded, setPortraitLoaded] = useState(false);
  const [flipped, setFlipped] = useState(() => new Set());
  const [modalProduct, setModalProduct] = useState(null);
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
    <>
      <section className="living-mosaic living-mosaic--hero" id="collection" ref={sectionRef}>
        <div className="living-mosaic__hero-shell">
          <div className="living-mosaic__story">
            <span className="living-mosaic__eyebrow">Her Story &amp; Her Creations</span>
            <h1>The closer you get, the more you see.</h1>
            <p className="living-mosaic__story-copy">Every named creation carries a piece of Sina&rsquo;s vision &mdash; glass, light, color, texture, and touch shaped into something that will never exist again.</p>
            <p className="living-mosaic__story-copy">Some are worn. Some are displayed. Some are gifted. All are made by hand and released only once.</p>
            <p className="living-mosaic__lead">Step back to see the artist.</p>
            <p className="living-mosaic__lead">Come closer to meet the creations.</p>
            <div className="living-mosaic__hero-actions">
              <Link className="button primary" to="/shop">Adopt the one that finds you.</Link>
              <a className="button ghost" href="#sinas-letter">Meet Sina</a>
            </div>
          </div>

          <div className="living-mosaic__visual">
            <div className={`living-mosaic__frame${mosaicReady ? ' is-mosaic-ready' : ''}`}>
              <img
                className="living-mosaic__portrait-reveal"
                src={PORTRAIT_SRC}
                alt="Thomasina Schnepf holding one of her fused-glass creations"
                onLoad={() => setPortraitLoaded(true)}
              />

              {!gridError && grid.length > 0 && (
                <div className="living-mosaic__grid-reveal" aria-hidden={!mosaicReady}>
                  <div className="living-mosaic__grid" style={{ '--mosaic-cols': GRID_COLS, '--mosaic-rows': GRID_ROWS }}>
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
                </div>
              )}

              <div className="living-mosaic__sr-status" role="status" aria-live="polite">
                {gridError
                  ? 'The portrait is visible. The mosaic could not be assembled right now.'
                  : mosaicReady
                    ? 'The mosaic is ready.'
                    : 'The portrait is visible while the mosaic is being assembled.'}
              </div>
            </div>
            <p className="living-mosaic__caption">Step back to see the artist. Move closer to discover the work.</p>
          </div>
        </div>

        <div className="living-mosaic__secondary-actions">
          <button type="button" className="button ghost" onClick={revealAll}>Reveal All Names</button>
          <button type="button" className="button ghost" onClick={resetAll}>Reset Tiles</button>
        </div>

        {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />}
      </section>

      <section className="cream-section story-grid" id="sinas-letter">
        <div className="portrait-card">
          <img src={PORTRAIT_SRC} alt="Thomasina Schnepf holding one of her fused-glass creations" />
        </div>
        <div>
          <div className="section-header">
            <span>A Letter From the Artist</span>
            <h2>My name is Thomasina Schnepf.</h2>
          </div>
          <p><strong>I am legally blind, and because of this, I create and “view” the world — and my work — very closely.</strong></p>
          <p>My disability is the result of a tumor on my optic nerve when I was four years old. For most people, vision shapes the way they see the world. For me, the loss of my sight has distorted my view of the world, but it has also caused me to examine everything much more closely in order to “see” what is truly there.</p>
          <p>It is from this kind of “vision” that I create my pieces. My artwork is shaped by my experiences, and each piece is intended to convey a part of the way I see and feel the world.</p>
          <p>Forms help me understand and create. They allow me to lay out my designs and guide my hands as I create individual, one-of-a-kind pieces. I need excellent lighting in order to see at all, so light plays an important role in my work.</p>
          <p>Because my view of the world is different, forms are not always separate, distinct, or concrete to me. Together with light and glass, they create fields of color and reflection that interact with one another. Up close, they create a believable world — one that I can see, feel, and be part of.</p>
          <p>Each unique, one-of-a-kind piece is created using various combinations of fused colored glass, glass gems, glass beads, glass stringers, and glass noodles.</p>
          <p>I hope you enjoy my creations as much as I have enjoyed creating each one especially for you.</p>
          <p><strong>God Bless,<br />Sina</strong></p>
        </div>
      </section>
    </>
  );
}
