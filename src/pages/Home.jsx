import React from 'react'
import { Link } from 'react-router-dom'
import { products } from '../data/products.js'

const featured = products.slice(0, 6)

export default function Home() {
  return (
    <>
      <section className="hero lifted-hero">
        <div className="hero-copy">
          <p className="eyebrow">One-of-one fused glass art</p>
          <h1>The world needs more of what Sina sees.</h1>
          <p className="lead">Thomasina Schnepf creates through light, touch, closeness, and faith. Each creation is named, numbered, and released once.</p>
          <div className="hero-actions">
            <Link className="btn btn-gold" to="/shop">Adopt a Creation</Link>
            <Link className="btn btn-ghost" to="/story">Our Story</Link>
          </div>
        </div>
        <div className="hero-image-card">
          <img src="/images/thomasina.jpg" alt="Thomasina Schnepf holding fused glass artwork" />
        </div>
      </section>

      <section className="cream-section split-section">
        <div>
          <p className="eyebrow copper">The Mission</p>
          <h2>Vision is more than eyesight.</h2>
          <p>At age four, a tumor on her optic nerve changed the way Thomasina sees the world. Her art comes from that closeness: forms, light, color, and texture brought together by hand.</p>
        </div>
        <div className="quote-card">
          <p>“My loss of sight has distorted my vision of your world, but caused me to examine everything much more closely in order to see what is truly there.”</p>
          <span>— Thomasina Schnepf</span>
        </div>
      </section>

      <section className="dark-section mosaic-preview">
        <div>
          <p className="eyebrow copper">The Mosaic Portrait</p>
          <h2>A portrait built from the collection.</h2>
          <p>From far away, visitors see Thomasina. Up close, they discover the individual creations: each tile, each name, each piece of the story.</p>
          <Link className="btn btn-outline-light" to="/collections">See the Vision</Link>
        </div>
        <div className="mosaic-placeholder" aria-label="Mosaic portrait placeholder">
          {featured.map((item, index) => (
            <img key={item.id} src={item.image} alt={item.name} style={{ gridColumn: index === 0 ? 'span 2' : 'span 1' }} />
          ))}
        </div>
      </section>

      <section className="cream-section">
        <div className="section-header">
          <p className="eyebrow copper">Available First</p>
          <h2>Featured adoptions.</h2>
          <p>These cards use the current product data while the Shopify catalog, cleaned images, measurements, and final inventory pass are completed.</p>
        </div>
        <div className="product-grid compact-grid">
          {featured.map(product => <ProductTile key={product.id} product={product} />)}
        </div>
      </section>
    </>
  )
}

function ProductTile({ product }) {
  return (
    <article className="product-tile">
      <img src={product.image} alt={product.name} />
      <div>
        <p className="product-meta">{product.id.toUpperCase()}</p>
        <h3>{product.name}</h3>
        <p>{product.subtitle}</p>
        <span>${product.price}</span>
      </div>
    </article>
  )
}
