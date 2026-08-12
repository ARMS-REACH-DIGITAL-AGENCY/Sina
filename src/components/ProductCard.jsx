import React, { useState } from 'react';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const sku = product.finalSku || product.sku || product.variantSku || product.id?.toUpperCase();
  const adoptionUrl = product.shopifyProductUrl || product.shopifyUrl || '';
  const inventoryStatus = product.inventoryStatus || product.catalogStatus || 'Needs physical confirmation';
  const imageStatus = product.imageStatus || 'Current image pending cleanup/verification';
  const isConfirmed = String(product.physicalItemConfirmed || '').toLowerCase() === 'yes';

  const handleAdoptionClick = (event) => {
    if (adoptionUrl) return;

    event.preventDefault();
    const contact = document.getElementById('contact');
    if (contact) {
      contact.scrollIntoView({ behavior: 'smooth' });
    }

    const message = `Interested in ${product.name}${sku ? ` (${sku})` : ''}`;
    window.history.replaceState(null, '', `#contact?piece=${encodeURIComponent(message)}`);
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
              {(product.colors || []).map((color, i) => (
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
          <span className="card__badge">{product.badge}</span>
        )}

        {sku && (
          <span className="card__sku-badge">{sku}</span>
        )}

        <div className="card__overlay">
          <a
            href={adoptionUrl || '#contact'}
            className="card__overlay-btn"
            onClick={handleAdoptionClick}
            target={adoptionUrl ? '_blank' : undefined}
            rel={adoptionUrl ? 'noreferrer' : undefined}
          >
            {adoptionUrl ? 'Adopt in Shopify' : 'Ask About This One'}
          </a>
        </div>
      </div>

      <div className="card__info">
        <div className="card__dots" aria-label="Piece color palette">
          {(product.colors || []).map((color, i) => (
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

        <div className="card__status-grid" aria-label="Catalog readiness status">
          <span className={`card__status ${isConfirmed ? 'card__status--ready' : ''}`}>
            Physical item: {isConfirmed ? 'Confirmed' : inventoryStatus}
          </span>
          <span className="card__status">Image: {imageStatus}</span>
        </div>

        <div className="card__footer">
          <span className="card__detail body-sm">{product.details}</span>
        </div>
      </div>
    </article>
  );
}
