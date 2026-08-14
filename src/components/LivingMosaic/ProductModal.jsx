import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProductModal({ product, onClose }) {
  const closeRef = useRef(null);
  const [showStory, setShowStory] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setShowStory(false);
    setActiveImage(0);
  }, [product]);

  const gallery = useMemo(() => {
    const images = Array.isArray(product?.images) && product.images.length ? product.images : [product?.image];
    return [...new Set(images.filter(Boolean))];
  }, [product]);

  if (!product) return null;

  const adopted = product.status === 'adopted';
  const story = product.story || product.description || product.line;
  const shopifyUrl = product.shopifyUrl || product.shopifyProductUrl || null;

  return (
    <div
      className="mosaic-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`mosaic-modal${showStory ? ' is-story-side' : ''}`} role="dialog" aria-modal="true" aria-labelledby="mosaic-modal-name">
        <button className="mosaic-modal__close" onClick={onClose} ref={closeRef} aria-label="Close creation details">
          <span aria-hidden="true">&times;</span>
        </button>

        <div className="mosaic-modal__card">
          <section className="mosaic-modal__side mosaic-modal__side--details" aria-hidden={showStory}>
            <div className="mosaic-modal__image">
              <img src={gallery[activeImage] || product.image} alt={`${product.name}, ${product.category}, a 1 of 1 fused glass creation`} />
            </div>

            {gallery.length > 1 && (
              <div className="mosaic-modal__thumbs" aria-label={`More views of ${product.name}`}>
                {gallery.map((src, index) => (
                  <button
                    type="button"
                    key={`${src}-${index}`}
                    className={index === activeImage ? 'is-active' : ''}
                    onClick={() => setActiveImage(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}

            <div className="mosaic-modal__body">
              <p className="mosaic-modal__eyebrow">{product.category} &middot; 1 of 1</p>
              <h3 id="mosaic-modal-name">{product.name}</h3>
              <p className="mosaic-modal__sku">{product.sku}</p>
              <p className="mosaic-modal__line">{product.line}</p>

              <div className="mosaic-modal__price-row">
                <span>Adoption price</span>
                <strong>${product.price}</strong>
              </div>

              <button type="button" className="button ghost mosaic-modal__flip" onClick={() => setShowStory(true)}>
                Read {product.name}&rsquo;s Story &rarr;
              </button>

              {adopted ? (
                <div className="mosaic-modal__status mosaic-modal__status--adopted">Adopted &mdash; 1 of 1, already loved</div>
              ) : shopifyUrl ? (
                <a className="button primary mosaic-modal__cta" href={shopifyUrl} target="_blank" rel="noreferrer">
                  Adopt {product.name}
                </a>
              ) : (
                <Link className="button primary mosaic-modal__cta" to={`/shop?piece=${encodeURIComponent(product.sku)}`} onClick={onClose}>
                  Adopt {product.name}
                </Link>
              )}
            </div>
          </section>

          <section className="mosaic-modal__side mosaic-modal__side--story" aria-hidden={!showStory}>
            <div className="mosaic-modal__story-panel">
              <p className="mosaic-modal__eyebrow">The Story of {product.name}</p>
              <h3>{product.name}</h3>
              <p className="mosaic-modal__story-copy">{story}</p>
              <p className="mosaic-modal__story-note">Made by hand. Named once. Released only once.</p>

              <button type="button" className="button ghost mosaic-modal__flip" onClick={() => setShowStory(false)}>
                &larr; Back to the Creation
              </button>

              {!adopted && (
                shopifyUrl ? (
                  <a className="button primary mosaic-modal__cta" href={shopifyUrl} target="_blank" rel="noreferrer">
                    Adopt {product.name}
                  </a>
                ) : (
                  <Link className="button primary mosaic-modal__cta" to={`/shop?piece=${encodeURIComponent(product.sku)}`} onClick={onClose}>
                    Adopt {product.name}
                  </Link>
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
