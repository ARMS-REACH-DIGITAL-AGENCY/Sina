import React, { useState } from 'react';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const beginAdoption = (e) => {
    e.preventDefault();
    sessionStorage.setItem('selectedCreation', JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
    }));
    document.getElementById('commission')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <article
      className={`card ${hovered ? 'card--hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card__image">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        ) : (
          <div className="card__image-placeholder" aria-hidden="true">
            <div className="card__glass-field">
              {product.colors.map((color, i) => (
                <div
                  key={i}
                  className="card__glass-orb"
                  style={{ background: color, '--orb-index': i }}
                />
              ))}
            </div>
            <div className="card__glass-shimmer" aria-hidden="true" />
          </div>
        )}

        {product.badge && (
          <span className="card__badge">Waiting for a Home</span>
        )}

        <div className="card__overlay">
          <a href="#commission" className="card__overlay-btn" onClick={beginAdoption}>
            Give This One a Home
          </a>
        </div>
      </div>

      <div className="card__info">
        <div className="card__dots" aria-label="Creation color palette">
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
