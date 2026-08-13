import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="page-hero dark-hero">
      <p className="eyebrow copper">Page not found</p>
      <h1>This creation has moved.</h1>
      <p>Return to the Sina’s Creations homepage or view the current adoption catalog.</p>
      <div className="hero-actions"><Link className="btn btn-gold" to="/">Home</Link><Link className="btn btn-ghost" to="/shop">Shop</Link></div>
    </section>
  )
}
