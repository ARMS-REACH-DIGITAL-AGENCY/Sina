import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const TILE_COUNT = 300;

function buildTiles(products) {
  if (!products?.length) return [];

  return Array.from({ length: TILE_COUNT }, (_, index) => {
    const product = products[index % products.length];
    return {
      ...product,
      tileKey: `${product.sku}-${index}`,
      tileIndex: index,
    };
  });
}

function getAdoptHref(product) {
  return product.shopifyCheckoutUrl || product.shopifyProductUrl || `/schedule?piece=${encodeURIComponent(product.sku)}`;
}

export default function InteractiveMosaic({ products = [] }) {
  const tiles = useMemo(() => buildTiles(products), [products]);
  const [flippedTile, setFlippedTile] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);

  const flipTile = (tileKey) => {
    setFlippedTile((current) => (current === tileKey ? null : tileKey));
  };

  const openProduct = (event, product) => {
    event.stopPropagation();
    setActiveProduct(product);
  };

  return (
    <div className="interactive-mosaic-wrap">
      <div className="interactive-mosaic-copy">
        <span>The Collection</span>
        <h2>A portrait built from 300 1-of-1 stories.</h2>
        <p>
          Touch any tile to reveal the creation's name. Select the name to open the piece profile,
          view the details, and continue to adoption checkout when available.
        </p>
      </div>

      <div className="interactive-mosaic-grid" aria-label="Interactive mosaic catalog of Sina's Creations">
        {tiles.map((tile) => {
          const isFlipped = flippedTile === tile.tileKey;
          return (
            <div
              key={tile.tileKey}
              className={`mosaic-tile ${isFlipped ? 'is-flipped' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${tile.name}, ${tile.sku}`}
              aria-pressed={isFlipped}
              onClick={() => flipTile(tile.tileKey)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  flipTile(tile.tileKey);
                }
              }}
            >
              <div className="mosaic-tile-inner">
                <div className="mosaic-tile-face mosaic-tile-front">
                  <img
                    src={tile.image}
                    alt=""
                    loading={tile.tileIndex < 36 ? 'eager' : 'lazy'}
                  />
                </div>
                <div className="mosaic-tile-face mosaic-tile-back">
                  <button
                    type="button"
                    className="mosaic-name-button"
                    onClick={(event) => openProduct(event, tile)}
                  >
                    <span>{tile.name}</span>
                    <small>{tile.sku}</small>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeProduct && (
        <ProductModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose }) {
  const adoptHref = getAdoptHref(product);
  const isShopify = Boolean(product.shopifyCheckoutUrl || product.shopifyProductUrl);
  const gallery = Array.from(new Set([product.image, ...(product.gallery || [])].filter(Boolean)));

  return (
    <div className="product-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="product-modal-close" onClick={onClose} aria-label="Close product details">
          ×
        </button>

        <div className="product-modal-gallery">
          {gallery.map((image, index) => (
            <img key={`${product.sku}-modal-${index}`} src={image} alt={`${product.name} product view ${index + 1}`} />
          ))}
        </div>

        <div className="product-modal-details">
          <span className="product-modal-kicker">{product.category} / {product.sku}</span>
          <h2 id="product-modal-title">{product.name}</h2>
          <strong>${product.price}</strong>
          <h3>{product.line}</h3>
          <p>{product.description || product.line}</p>

          <ul>
            <li>1-of-1 original</li>
            <li>Handcrafted by Thomasina Schnepf</li>
            <li>Named, numbered, and released once</li>
            <li>Shipping included unless noted otherwise</li>
          </ul>

          {isShopify ? (
            <a className="button primary modal-adopt-button" href={adoptHref} target="_blank" rel="noreferrer">
              Adopt Now
            </a>
          ) : (
            <Link className="button primary modal-adopt-button" to={adoptHref} onClick={onClose}>
              Adopt Now
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
