import React, { useState } from 'react';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className={`card ${hovered ? 'card--hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area — placeholder until real photos are added */}
      <div className="card__image">
        <div className="card__image-placeholder" aria-hidden="true">
          {/* Glass palette orbs — the signature element */}
          <div className="card__glass-field">
            {product.colors.map((color, i) => (
              <div
                key={i}
                className="card__glass-orb"
                style={{
                  background: color,
                  '--orb-index': i,
                }}
              />
            ))}
          </div>
          <div className="card__glass-shimmer" aria-hidden="true" />
        </div>

        {/* Badge */}
        {product.badge && (
          <span className="card__badge">{product.badge}</span>
        )}

        {/* Hover overlay */}
        <div className="card__overlay">
          <a
            href={`#contact`}
            className="card__overlay-btn"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Inquire About This Piece
          </a>
        </div>
      </div>

      {/* Info */}
      <div className="card__info">
        {/* Color dots — the signature */}
        <div className="card__dots" aria-label="Piece color palette">
          {product.colors.map((color, i) => (
            <span
              key={i}
              className="card__dot"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>

        <div className="card__name-row">
          <h3 className="card__name">{product.name}</h3>
          <span className="card__price">${product.price}</span>
        </div>

        <p className="card__subtitle">{product.subtitle}</p>

        <p className="card__description">{product.description}</p>

        <div className="card__footer">
          <span className="card__detail body-sm">{product.details}</span>
        </div>
      </div>
    </article>
  );
}
