import React, { useState } from 'react'
import { collections, products } from '../data/products.js'

export default function Shop() {
  const [active, setActive] = useState('all')
  const visible = active === 'all' ? products.slice(0, 24) : products.filter(product => product.collection === active).slice(0, 24)

  return (
    <>
      <section className="page-hero dark-hero shop-hero">
        <p className="badge-label">Adoption catalog</p>
        <h1>Available Creations</h1>
        <p>Every creation is named, numbered, and released once. The Shopify checkout layer will be connected after final inventory and product URLs are confirmed.</p>
      </section>

      <section className="cream-section shop-section">
        <div className="tabs shop-tabs">
          <button className={active === 'all' ? 'active' : ''} onClick={() => setActive('all')}>All</button>
          {collections.map(collection => <button key={collection.id} className={active === collection.id ? 'active' : ''} onClick={() => setActive(collection.id)}>{collection.label}</button>)}
        </div>
        <div className="shop-card-grid">
          {visible.map(product => <ShopCard key={product.id} product={product} />)}
        </div>
      </section>
    </>
  )
}

function ShopCard({ product }) {
  return (
    <article className="shop-card">
      <div className="shop-card-image"><img src={product.image} alt={product.name} /></div>
      <div className="shop-card-body">
        <p className="product-meta">{product.id.toUpperCase()}</p>
        <h3>{product.name}</h3>
        <p>{product.subtitle}</p>
        <div className="shop-card-footer"><span>${product.price}</span><button>Adopt {product.name}</button></div>
      </div>
    </article>
  )
}
