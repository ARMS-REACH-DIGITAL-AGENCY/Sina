import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ProductCard } from '../ProductCard.jsx';

// Tapping a mosaic tile used to open a bespoke flip-card modal with its own
// (increasingly stale) copy of the product details. That duplicated the
// real ProductCard and drifted out of sync with it -- this just reuses the
// exact same component the shop page renders, inside a lightweight modal
// shell, so a piece looks identical whether someone finds it in the mosaic
// or on the shop grid.
export default function ProductModal({ product, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Freeze the page behind the modal. Beyond the usual reason (the page
    // scrolling under an open dialog feels broken), this is what stops the
    // backdrop from being the only thing that paints on mobile: the modal
    // opens straight out of a touch gesture on a hardware-accelerated
    // transform layer, and letting that scroll continue underneath left the
    // card unpainted until something forced a recomposite.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (!product) return null;

  // Rendered into <body> rather than inline. Inline, this sits inside the
  // mosaic's stacking/compositing context -- the zoom stage next to it is a
  // promoted layer (will-change: transform) that is mid-gesture at exactly
  // the moment a tile is tapped. On mobile that left a position:fixed
  // overlay dimming the page with no visible card until the user tapped
  // again or scrolled. As a direct child of <body> it has nothing to get
  // trapped behind.
  return createPortal(
    <div
      className="mosaic-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mosaic-modal" role="dialog" aria-modal="true" aria-label={`${product.name} details`}>
        <button className="mosaic-modal__close" onClick={onClose} ref={closeRef} aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
        <ProductCard product={product} />
      </div>
    </div>,
    document.body
  );
}
