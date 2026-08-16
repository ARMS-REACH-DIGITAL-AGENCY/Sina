import React, { useEffect, useMemo, useRef, useState } from 'react';

function ProductStory({ product }) {
  if (product.descriptionHtml) {
    return <div className="mosaic-modal__story-copy mosaic-modal__story-copy--rich" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />;
  }

  return <p className="mosaic-modal__story-copy">{product.story || product.description || product.line}</p>;
}

function AdoptionState({ adopted }) {
  if (adopted) {
    return <div className="mosaic-modal__status mosaic-modal__status--adopted">Adopted — 1 of 1, already loved</div>;
  }

  return (
    <>
      <button type="button" className="button primary mosaic-modal__cta" disabled aria-disabled="true">
        Adoption Coming Soon
      </button>
      <p className="mosaic-modal__footnote">Inventory is being updated, so adoption checkout is temporarily paused.</p>
    </>
  );
}

function stopEvent(event) {
  event.stopPropagation();
}

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

  function handleFlip() {
    setShowStory((value) => !value);
  }

  function handleCardKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFlip();
    }
  }

  function handleThumbSelect(index, event) {
    event.stopPropagation();
    setActiveImage(index);
  }

  function handleCloseClick(event) {
    event.stopPropagation();
    onClose();
  }

  return (
    <div
      className="mosaic-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mosaic-modal" role="dialog" aria-modal="true" aria-labelledby="mosaic-modal-name">
        <button className="mosaic-modal__close" onClick={handleCloseClick} ref={closeRef} aria-label="Close creation details">
          <span aria-hidden="true">&times;</span>
        </button>

        <div
          className={`mosaic-modal__card${showStory ? ' is-story-side' : ''}`}
          onClick={handleFlip}
          onKeyDown={handleCardKeyDown}
          role="button"
          tabIndex={0}
          aria-label={showStory ? `Flip ${product.name} back to the main view` : `Flip ${product.name} to the full details view`}
        >
          <section className="mosaic-modal__side mosaic-modal__side--details" aria-hidden={showStory}>
            <div className="mosaic-modal__image">
              <img src={gallery[activeImage] || product.image} alt={`${product.name}, ${product.category}, a 1-of-1 fused glass creation`} />
            </div>

            {gallery.length > 1 && (
              <div className="mosaic-modal__thumbs" aria-label={`More views of ${product.name}`}>
                {gallery.map((src, index) => (
                  <button
                    type="button"
                    key={`${src}-${index}`}
                    className={index === activeImage ? 'is-active' : ''}
                    onClick={(event) => handleThumbSelect(index, event)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}

            <div className="mosaic-modal__body">
              <p className="mosaic-modal__eyebrow">{product.category} · <span className="nowrap">1-of-1</span></p>
              <h3 id="mosaic-modal-name">{product.name}</h3>
              <p className="mosaic-modal__sku">SKU {product.sku}</p>
              <p className="mosaic-modal__line">{product.line}</p>

              <div className="mosaic-modal__price-row">
                <span>Adoption price</span>
                <strong>${product.price}</strong>
              </div>

              <AdoptionState adopted={adopted} />
              <p className="mosaic-modal__flip-hint">Tap anywhere to flip for full details.</p>
            </div>
          </section>

          <section className="mosaic-modal__side mosaic-modal__side--story" aria-hidden={!showStory}>
            <div className="mosaic-modal__story-panel">
              <p className="mosaic-modal__eyebrow">{product.name} · SKU {product.sku}</p>
              <h3>Full Description</h3>
              <ProductStory product={product} />
              <p className="mosaic-modal__story-note">Made by hand. Named once. Released only once.</p>
              <AdoptionState adopted={adopted} />
              <p className="mosaic-modal__flip-hint mosaic-modal__flip-hint--back">Tap anywhere to flip back.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
