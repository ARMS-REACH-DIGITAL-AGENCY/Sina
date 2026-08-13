import React, { useState } from 'react'
import { collections, products } from '../data/products.js'

export default function Collections() {
  const [active, setActive] = useState(collections[0]?.id || 'pendants')
  const selected = collections.find(collection => collection.id === active)
  const visible = products.filter(product => product.collection === active).slice(0, 9)

  return (
    <>
      <section className="page-hero dark-hero">
        <p className="eyebrow copper">The Collections</p>
        <h1>One creation. One name. One home.</h1>
        <p>A portfolio of fused glass work organized by how people experience it: worn, displayed, gifted, collected, or carried.</p>
      </section>

      <section className="cream-section collections-layout">
        <div className="tabs">
          {collections.map(collection => (
            <button key={collection.id} className={active === collection.id ? 'active' : ''} onClick={() => setActive(collection.id)}>{collection.label}</button>
          ))}
        </div>

        <div className="collection-feature">
          <div>
            <p className="eyebrow copper">{selected?.label}</p>
            <h2>{selected?.tagline}</h2>
            <p>Each category keeps the Lifted-style clarity but gives Sina’s work its own adoption language: named pieces, one-of-one inventory, and story-driven presentation.</p>
          </div>
          <div className="example-messages">
            <span>Available once.</span>
            <span>Adopted, not bought.</span>
            <span>Made by hand.</span>
            <span>Released with intention.</span>
          </div>
        </div>

        <div className="product-grid">
          {visible.map(product => (
            <article className="catalog-card" key={product.id}>
              <img src={product.image} alt={product.name} />
              <p className="product-meta">{product.id.toUpperCase()}</p>
              <h3>{product.name}</h3>
              <p>{product.subtitle}</p>
              <strong>${product.price}</strong>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
