import React, { useEffect, useRef } from 'react';
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
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;

  return (
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
    </div>
  );
}
