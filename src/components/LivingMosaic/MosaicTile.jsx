import React from 'react';
import { rgbToCss } from './colorMatch.js';

export default function MosaicTile({ cell, product, active, onTap }) {
  if (!product) return <div className="mosaic-tile mosaic-tile--empty" aria-hidden="true" />;

  return (
    <div
      className="mosaic-tile"
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
          <img src={product.image} alt="" loading="lazy" decoding="async" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
