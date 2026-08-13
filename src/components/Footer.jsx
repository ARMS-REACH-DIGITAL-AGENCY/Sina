import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <div className="brand-script">Sina's</div>
        <div className="brand-subtitle">Creations</div>
        <p>One-of-one fused glass art, made by Thomasina Schnepf and released with intention.</p>
        <em>Light. Color. Form.</em>
      </div>

      <div>
        <h4>Navigate</h4>
        <Link to="/">Home</Link>
        <Link to="/story">Our Story</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/shop">Shop</Link>
      </div>

      <div>
        <h4>Get Involved</h4>
        <Link to="/collaborate">Collaborate</Link>
        <Link to="/wholesale">Wholesale</Link>
        <Link to="/schedule">Schedule a Call</Link>
      </div>

      <div>
        <h4>Adopt Beauty</h4>
        <p>Every creation is named, numbered, and released once. When it finds a home, it is gone.</p>
        <Link className="btn btn-gold" to="/shop">View Available Creations</Link>
      </div>
    </footer>
  )
}
