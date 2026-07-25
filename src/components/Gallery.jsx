import React from 'react';
import { products } from '../data/products';

export default function Gallery() {
  const featured = products.slice(0, 18);

  return (
    <section id="gallery" style={{ background: 'var(--black)', padding: '96px 0' }}>
      <div className="container">
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <p className="eyebrow" style={{ color: 'var(--gold)' }}>Get Closer</p>
          <h2 className="heading-lg" style={{ color: 'var(--off-white)', marginBottom: 18 }}>
            From a distance, you see color.<br />
            <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Up close, you meet someone.</em>
          </h2>
          <p className="body-lg" style={{ color: 'rgba(247,244,236,0.68)', maxWidth: 640 }}>
            Thomasina sees her materials inches away. This gallery invites you to do the same.
            Move closer, notice the details, and select any creation to meet the story behind it.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}>
          {featured.map((product, index) => (
            <a
              key={product.id}
              href="#shop"
              aria-label={`Meet ${product.name}`}
              title={`${product.name} — ${product.subtitle}`}
              style={{
                display: 'block',
                aspectRatio: index % 7 === 0 ? '1 / 1.35' : '1 / 1',
                overflow: 'hidden',
                border: '1px solid rgba(247,244,236,0.12)',
                background: 'var(--charcoal)',
              }}
            >
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.35s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            </a>
          ))}
        </div>

        <div style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="#shop" className="btn-primary">Meet Every Available Creation</a>
          <a href="#artist" className="btn-ghost">See How Thomasina Sees</a>
        </div>
      </div>
    </section>
  );
}
