import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useMosaicProducts from '../../hooks/useMosaicProducts.js';
import { buildMosaicGrid } from './colorMatch.js';
import MosaicTile from './MosaicTile.jsx';
import ProductModal from './ProductModal.jsx';
import './living-mosaic.css';
import './mosaic-experiment-overrides.css';
import './mosaic-brand-alignment.css';

// Claude's working matcher and 29x51 grid stay unchanged for Gate 1.
const PORTRAIT_SRC = '/images/hero/PLQ-FG-LG-45.JPG';
const GRID_COLS = 29;
const GRID_ROWS = 51;
const MAX_ZOOM = 4;
const ZOOM_RESET_THRESHOLD = 1.02;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function LivingMosaic() {
  const { products, loading: productsLoading } = useMosaicProducts();

  const [grid, setGrid] = useState([]);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState(false);
  const [portraitLoaded, setPortraitLoaded] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [active, setActive] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });

  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const zoomRef = useRef({ scale: 1, x: 0, y: 0 });
  const gestureRef = useRef({ type: 'idle' });
  const suppressTapRef = useRef(false);

  useEffect(() => {
    zoomRef.current = zoomState;
  }, [zoomState]);

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

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    function clampZoomState(scale, x, y) {
      if (scale <= 1) {
        return { scale: 1, x: 0, y: 0 };
      }
      const rect = viewport.getBoundingClientRect();
      const maxX = (rect.width * (scale - 1)) / 2;
      const maxY = (rect.height * (scale - 1)) / 2;
      return {
        scale,
        x: clamp(x, -maxX, maxX),
        y: clamp(y, -maxY, maxY),
      };
    }

    function pointFromTouch(touch) {
      const rect = viewport.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    function distanceBetween(first, second) {
      return Math.hypot(first.x - second.x, first.y - second.y);
    }

    function midpointBetween(first, second) {
      return {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
    }

    function beginPan(touch) {
      const point = pointFromTouch(touch);
      const current = zoomRef.current;
      gestureRef.current = {
        type: 'pan',
        touchId: touch.identifier,
        startPoint: point,
        startX: current.x,
        startY: current.y,
      };
    }

    function beginPinch(touches) {
      const first = pointFromTouch(touches[0]);
      const second = pointFromTouch(touches[1]);
      const midpoint = midpointBetween(first, second);
      const rect = viewport.getBoundingClientRect();
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const current = zoomRef.current;

      gestureRef.current = {
        type: 'pinch',
        startDistance: distanceBetween(first, second),
        startScale: current.scale,
        contentPoint: {
          x: (midpoint.x - center.x - current.x) / current.scale,
          y: (midpoint.y - center.y - current.y) / current.scale,
        },
      };
    }

    function handleTouchStart(event) {
      if (event.touches.length >= 2) {
        suppressTapRef.current = true;
        event.preventDefault();
        beginPinch(event.touches);
        return;
      }

      if (event.touches.length === 1 && zoomRef.current.scale > 1) {
        beginPan(event.touches[0]);
      }
    }

    function handleTouchMove(event) {
      if (event.touches.length >= 2) {
        const first = pointFromTouch(event.touches[0]);
        const second = pointFromTouch(event.touches[1]);
        const midpoint = midpointBetween(first, second);
        const distance = distanceBetween(first, second);
        const rect = viewport.getBoundingClientRect();
        const center = { x: rect.width / 2, y: rect.height / 2 };

        if (gestureRef.current.type !== 'pinch') {
          beginPinch(event.touches);
        }

        const gesture = gestureRef.current;
        const nextScale = clamp(gesture.startScale * (distance / gesture.startDistance), 1, MAX_ZOOM);
        const nextX = midpoint.x - center.x - gesture.contentPoint.x * nextScale;
        const nextY = midpoint.y - center.y - gesture.contentPoint.y * nextScale;

        suppressTapRef.current = true;
        event.preventDefault();
        setZoomState(clampZoomState(nextScale, nextX, nextY));
        return;
      }

      if (event.touches.length === 1 && zoomRef.current.scale > 1) {
        if (gestureRef.current.type !== 'pan' || gestureRef.current.touchId !== event.touches[0].identifier) {
          beginPan(event.touches[0]);
        }

        const gesture = gestureRef.current;
        const point = pointFromTouch(event.touches[0]);
        const deltaX = point.x - gesture.startPoint.x;
        const deltaY = point.y - gesture.startPoint.y;

        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
          suppressTapRef.current = true;
        }

        event.preventDefault();
        setZoomState(clampZoomState(zoomRef.current.scale, gesture.startX + deltaX, gesture.startY + deltaY));
      }
    }

    function handleTouchEnd(event) {
      if (event.touches.length >= 2) {
        beginPinch(event.touches);
        return;
      }

      if (event.touches.length === 1 && zoomRef.current.scale > 1) {
        beginPan(event.touches[0]);
        return;
      }

      gestureRef.current = { type: 'idle' };

      if (zoomRef.current.scale <= ZOOM_RESET_THRESHOLD) {
        setZoomState({ scale: 1, x: 0, y: 0 });
      }
    }

    viewport.addEventListener('touchstart', handleTouchStart, { passive: false });
    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewport.addEventListener('touchend', handleTouchEnd, { passive: false });
    viewport.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      viewport.removeEventListener('touchstart', handleTouchStart);
      viewport.removeEventListener('touchmove', handleTouchMove);
      viewport.removeEventListener('touchend', handleTouchEnd);
      viewport.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    function handleFullscreenChange() {
      const viewport = viewportRef.current;
      setIsFullscreen(Boolean(viewport && document.fullscreenElement === viewport));
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const cellProduct = useMemo(() => {
    return (cell) => (cell ? products[cell.productIndex] : null);
  }, [products]);

  const mosaicReady = portraitLoaded && !productsLoading && !gridLoading && !gridError && grid.length > 0;

  function handleTap(cell) {
    setModalProduct(cellProduct(cell));
  }

  function handleToggleNames() {
    setShowNames((value) => !value);
  }

  async function handleToggleFullscreen() {
    const viewport = viewportRef.current;
    if (!viewport || typeof document === 'undefined') {
      return;
    }

    try {
      if (document.fullscreenElement === viewport) {
        await document.exitFullscreen?.();
        return;
      }

      if (!document.fullscreenElement) {
        await viewport.requestFullscreen?.();
      }
    } catch {
      setIsFullscreen(false);
    }
  }

  function handleViewportClickCapture(event) {
    if (!suppressTapRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressTapRef.current = false;
  }

  return (
    <section className="living-mosaic living-mosaic--hero" id="collection" ref={sectionRef}>
      <div className="living-mosaic__hero-shell">
        <div className="living-mosaic__story">
          <div className="pill-eyebrow living-mosaic__eyebrow">Her Story. Her Creations. Your Choice.</div>
          <h1>The closer you get, the more you see.</h1>

          <div className="living-mosaic__copy-stack">
            <p className="living-mosaic__story-copy">Every named creation carries a piece of Sina&rsquo;s vision &mdash; glass, light, color, texture, and touch shaped into something that will never exist again.</p>
            <p className="living-mosaic__story-copy">Some are worn. Some are displayed. Some are gifted. All are made by hand and released only once.</p>
          </div>

          <div className="living-mosaic__lead-stack">
            <p className="living-mosaic__lead">Step back to see this amazing legally blind artist.</p>
            <p className="living-mosaic__lead">Come closer to meet her 1-of-1 creations.</p>
          </div>
        </div>

        <div className="living-mosaic__visual">
          <div className={`living-mosaic__frame${mosaicReady ? ' is-mosaic-ready' : ''}`}>
            <div
              ref={viewportRef}
              className={`living-mosaic__viewport${zoomState.scale > 1 ? ' is-zoomed' : ''}`}
              onClickCapture={handleViewportClickCapture}
              aria-label="Interactive mosaic portrait"
            >
              <div
                className="living-mosaic__zoom-stage"
                style={{
                  transform: `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale(${zoomState.scale})`,
                }}
              >
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
                            showNames={showNames}
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
              </div>
            </div>

            <div className="living-mosaic__sr-status" role="status" aria-live="polite">
              {gridError
                ? 'The portrait is visible. The mosaic could not be assembled right now.'
                : mosaicReady
                  ? 'The mosaic is ready. Pinch and drag inside the frame to explore, or tap a creation to view its details.'
                  : 'The portrait is visible while the mosaic is being assembled.'}
            </div>
          </div>
        </div>

        <p className="living-mosaic__baseline-hint">Pinch and drag inside the portrait to explore the creations up close. Tap Full Screen for a larger view.</p>

        <div className="living-mosaic__cta-row">
          <Link className="button primary" to="/shop">Adopt A Creation</Link>
          <Link className="button ghost" to="/meet-sina">A Message From The Designer</Link>
          <button
            type="button"
            className={`button ghost${showNames ? ' is-active' : ''}`}
            onClick={handleToggleNames}
          >
            {showNames ? 'Hide Names' : 'Show Names'}
          </button>
          <button type="button" className="button ghost" onClick={handleToggleFullscreen}>
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
        </div>
      </div>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />}
    </section>
  );
}
