import React from 'react';
import { rgbToCss } from './colorMatch.js';

export default function MosaicTile({ cell, product, flipped, active, reducedMotion, onTap }) {
  if (!product) return <div className="mosaic-tile mosaic-tile--empty" aria-hidden="true" />;

  const label = flipped
    ? `${product.name}, ${product.category}. Press again to view and adopt this piece.`
    : `Hidden piece. Press to reveal its name.`;

  const tileColor = rgbToCss(cell.color);

  return (
    <div
      className={`mosaic-tile${flipped ? ' is-flipped' : ''}${reducedMotion ? ' no-flip-motion' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={label}
      onClick={() => onTap(cell)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(cell);
        }
      }}
    >
      <div className="mosaic-tile__inner">
        <div
          className="mosaic-tile__face mosaic-tile__face--front"
          style={{ backgroundColor: tileColor, '--tile-target-color': tileColor }}
        >
          {active && (
            <img src={product.image} alt="" loading="lazy" decoding="async" aria-hidden="true" />
          )}
        </div>
        <div className="mosaic-tile__face mosaic-tile__face--back">
          <span className="mosaic-tile__name">{product.name}</span>
        </div>
      </div>
    </div>
  );
}
