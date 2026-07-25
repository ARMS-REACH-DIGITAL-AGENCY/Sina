import React, { useState } from 'react';
import { products, collections } from '../data/products';
import ProductCard from './ProductCard';
import './Shop.css';

export default function Shop() {
  const [activeCollection, setActiveCollection] = useState('all');

  const filtered = activeCollection === 'all'
    ? products
    : products.filter(p => p.collection === activeCollection);

  return (
    <section className="shop section" id="shop">
      <div className="container">
        <div className="shop__header">
          <p className="eyebrow">Meet the Creations</p>
          <h2 className="heading-lg shop__title">
            Every one has<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>a name.</em>
          </h2>
          <p className="body-lg shop__sub">
            Each creation is handmade, named, numbered, and released only once.
            No replicas. No second run. When one is adopted, that exact creation has found its home.
          </p>
        </div>

        <div className="shop__filters" role="tablist" aria-label="Filter creations by collection">
          <button
            className={`shop__filter-btn ${activeCollection === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCollection('all')}
            role="tab"
            aria-selected={activeCollection === 'all'}
          >
            All Creations
          </button>
          {collections.map(col => (
            <button
              key={col.id}
              className={`shop__filter-btn ${activeCollection === col.id ? 'active' : ''}`}
              onClick={() => setActiveCollection(col.id)}
              role="tab"
              aria-selected={activeCollection === col.id}
            >
              {col.label}
            </button>
          ))}
        </div>

        {activeCollection !== 'all' && (
          <p className="shop__tagline">
            {collections.find(c => c.id === activeCollection)?.tagline}
          </p>
        )}

        <div className="shop__grid">
          {filtered.map((product, i) => (
            <div
              key={product.id}
              className="reveal"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="shop__footer">
          <p className="body-sm">
            Looking for something made around a person, memory, color, or occasion?
          </p>
          <a href="#commission" className="btn-ghost">
            Commission a New Creation
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
