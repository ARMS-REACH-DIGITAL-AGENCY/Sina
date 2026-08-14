import React, { useMemo, useState } from 'react';

const TILE_COUNT = 300;
const COLUMNS = 20;
const ARTIST_IMAGE = '/images/thomasina.jpg';

const sinaLetter = [
  'My name is Thomasina Schnepf. I am legally blind, and because of this, I create and “view” the world — and my work — very closely.',
  'My disability is the result of a tumor on my optic nerve when I was four years old. For most people, vision shapes the way they see the world. For me, the loss of my sight has distorted my view of the world, but it has also caused me to examine everything much more closely in order to “see” what is truly there.',
  'It is from this kind of “vision” that I create my pieces. My artwork is shaped by my experiences, and each piece is intended to convey a part of the way I see and feel the world.',
  'Forms help me understand and create. They allow me to lay out my designs and guide my hands as I create individual, one-of-a-kind pieces. I need excellent lighting in order to see at all, so light plays an important role in my work.',
  'Because my view of the world is different, forms are not always separate, distinct, or concrete to me. Together with light and glass, they create fields of color and reflection that interact with one another. Up close, they create a believable world — one that I can see, feel, and be part of.',
  'Each unique, one-of-a-kind piece is created using various combinations of fused colored glass, glass gems, glass beads, glass stringers, and glass noodles.',
  'I hope you enjoy my creations as much as I have enjoyed creating each one especially for you.',
];

function formatPrice(price) {
  const value = Number(price);
  return Number.isFinite(value) ? `$${value}` : 'Price pending';
}

function tileZone(index) {
  const col = index % COLUMNS;
  const row = Math.floor(index / 15);
  const x = col / COLUMNS;
  const y = row / 15;
  const face = ((x - 0.54) / 0.24) ** 2 + ((y - 0.36) / 0.3) ** 2 < 1;
  if (face) return 'face';
  if (y > 0.63 && x > 0.28 && x < 0.82) return 'shirt';
  if (x < 0.25 && y < 0.75) return 'light';
  return 'glass';
}

function buildTiles(products) {
  if (!products?.length) return [];

  return Array.from({ length: TILE_COUNT }, (_, index) => {
    const product = products[index % products.length];
    return {
      ...product,
      tileKey: `${product.sku}-${index}`,
      zone: tileZone(index),
      tileIndex: index,
    };
  });
}

export default function LivingMosaicPreview({ products = [] }) {
  const [flippedKey, setFlippedKey] = useState(null);
  const [namesVisible, setNamesVisible] = useState(true);
  const [activeProduct, setActiveProduct] = useState(null);
  const [showLetter, setShowLetter] = useState(false);
  const tiles = useMemo(() => buildTiles(products), [products]);

  function selectTile(tile) {
    if (namesVisible || flippedKey === tile.tileKey) {
      setActiveProduct(tile);
      return;
    }
    setFlippedKey(tile.tileKey);
  }

  function resetTiles() {
    setFlippedKey(null);
    setNamesVisible(true);
  }

  return (
    <section className="living-mosaic-preview editorial-mosaic-hero" id="living-mosaic">
      <div className="living-mosaic-intro">
        <span>Her Story & Her Creations</span>
        <h2>The closer you get, the more you see.</h2>
        <p>Every named creation carries a piece of Sina’s vision — glass, light, color, texture, and touch shaped into something that will never exist again.</p>
        <p><strong>Step back to see the artist.</strong></p>
        <p><strong>Come closer to meet the creations.</strong></p>
        <div className="living-mosaic-actions">
          <a href="/shop">Adopt the one that finds you</a>
          <button type="button" onClick={() => setShowLetter(true)}>Meet Sina</button>
        </div>
      </div>

      <div className="living-mosaic-preview-grid-wrap" aria-label="Interactive portrait mosaic made from Sina's named creations">
        <div className="living-mosaic-preview-grid" style={{ backgroundImage: `url(${ARTIST_IMAGE})` }}>
          {tiles.map((tile) => {
            const flipped = flippedKey === tile.tileKey;
            const showName = namesVisible || flipped;
            return (
              <button
                key={tile.tileKey}
                type="button"
                className={`living-tile ${flipped ? 'is-flipped' : ''} ${showName ? 'name-visible' : ''} zone-${tile.zone}`}
                aria-pressed={showName}
                aria-label={showName ? `Open ${tile.name}, ${tile.sku}` : `Reveal ${tile.name}, ${tile.sku}`}
                onClick={() => selectTile(tile)}
              >
                <span className="living-tile-inner">
                  <span className="living-tile-front">
                    <img src={tile.image} alt="" loading={tile.tileIndex < 40 ? 'eager' : 'lazy'} />
                  </span>
                  <span className="living-tile-back">
                    <strong>{tile.name}</strong>
                    <small>{tile.sku}</small>
                  </span>
                </span>
                {showName && (
                  <span className="living-tile-label" aria-hidden="true">
                    <strong>{tile.name}</strong>
                    <small>{tile.sku}</small>
                  </span>
                )}
              </button>
            );
          })}
          <div className="living-mosaic-control-strip">
            <span>Step back to see Sina. Come closer to meet the creations.</span>
            <button type="button" onClick={() => setNamesVisible((value) => !value)}>{namesVisible ? 'Hide Names' : 'Reveal Names'}</button>
            <button type="button" onClick={resetTiles}>Reset Tiles</button>
          </div>
        </div>
      </div>

      {activeProduct && (
        <div className="living-modal-backdrop" onClick={() => setActiveProduct(null)}>
          <section className="living-product-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="living-close" onClick={() => setActiveProduct(null)}>×</button>
            <div className="living-product-image"><img src={activeProduct.image} alt={activeProduct.name} /></div>
            <div className="living-product-copy">
              <span>{activeProduct.category} / {activeProduct.sku}</span>
              <h3>{activeProduct.name}</h3>
              <strong>{formatPrice(activeProduct.price)}</strong>
              <h4>{activeProduct.line}</h4>
              <p>{activeProduct.description}</p>
              <p>Named once. Made by hand. Released only once.</p>
              <a href={`/schedule?piece=${encodeURIComponent(activeProduct.sku)}`}>Adopt {activeProduct.name}</a>
            </div>
          </section>
        </div>
      )}

      {showLetter && (
        <div className="living-modal-backdrop" onClick={() => setShowLetter(false)}>
          <section className="living-letter-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="living-close" onClick={() => setShowLetter(false)}>×</button>
            <img src={ARTIST_IMAGE} alt="Thomasina Schnepf creating glass art" />
            <article>
              <span>About the Artist</span>
              <h3>A letter from Sina</h3>
              {sinaLetter.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <p><strong>God Bless,<br />Sina</strong></p>
            </article>
          </section>
        </div>
      )}
    </section>
  );
}
