import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

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
  const adopted = product.status === 'adopted';

  return (
    <div
      className="mosaic-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mosaic-modal" role="dialog" aria-modal="true" aria-labelledby="mosaic-modal-name">
        <button className="mosaic-modal__close" onClick={onClose} ref={closeRef} aria-label="Close">
          &times;
        </button>
        <div className="mosaic-modal__image">
          <img src={product.image} alt={`${product.name}, ${product.category}, a one-of-one fused glass piece`} />
        </div>
        <div className="mosaic-modal__body">
          <p className="mosaic-modal__eyebrow">{product.category} &middot; One of One</p>
          <h3 id="mosaic-modal-name">{product.name}</h3>
          <p className="mosaic-modal__sku">{product.sku}</p>
          <p className="mosaic-modal__line">{product.line}</p>
          <div className="mosaic-modal__price-row">
            <span>Adoption price</span>
            <strong>${product.price}</strong>
          </div>
          {adopted ? (
            <>
              <div className="mosaic-modal__status mosaic-modal__status--adopted">Adopted — one of one, already loved</div>
              <button className="button ghost mosaic-modal__cta" disabled>
                Adopted
              </button>
            </>
          ) : (
            <Link className="button primary mosaic-modal__cta" to={`/schedule?piece=${encodeURIComponent(product.sku)}`} onClick={onClose}>
              Adopt {product.name}
            </Link>
          )}
          <p className="mosaic-modal__footnote">One of one. Once she's adopted, she won't come again.</p>
        </div>
      </div>
    </div>
  );
}
