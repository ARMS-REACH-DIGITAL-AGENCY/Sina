import React from 'react';
import { rgbToCss } from './colorMatch.js';

export default function MosaicTile({ cell, product, active, onTap, showNames }) {
  if (!product) return <div className="mosaic-tile mosaic-tile--empty" aria-hidden="true" />;

  const categoryClass =
    product.category === 'Necklaces' || product.category === 'Lanyards' ? ' mosaic-tile--necklace' : '';
  const customCropClass = cell.isCustomCrop ? ' mosaic-tile--custom-crop' : '';

  return (
    <div
      className={`mosaic-tile${showNames ? ' has-name-overlay' : ''}${categoryClass}${customCropClass}`}
      role="button"
      tabIndex={0}
      aria-label={`Open ${product.name}, ${product.category}`}
      onClick={() => onTap(cell)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(cell);
        }
      }}
    >
      <div
        className="mosaic-tile__face mosaic-tile__face--front"
        style={{ backgroundColor: rgbToCss(cell.color) }}
      >
        {active && (
          <img src={cell.resolvedSrc || product.image} alt="" loading="lazy" decoding="async" aria-hidden="true" />
        )}
      </div>
      <span className="mosaic-tile__name" aria-hidden="true">{product.name}</span>
    </div>
  );
}
