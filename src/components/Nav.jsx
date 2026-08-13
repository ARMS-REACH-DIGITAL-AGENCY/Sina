import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/story', label: 'Our Story' },
  { to: '/collections', label: 'Collections' },
  { to: '/collaborate', label: 'Collaborate' },
  { to: '/wholesale', label: 'Wholesale' },
  { to: '/shop', label: 'Shop' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-nav">
      <Link className="brand-mark" to="/" onClick={() => setOpen(false)} aria-label="Sina's Creations home">
        <span className="brand-script">Sina's</span>
        <span className="brand-subtitle">Creations</span>
      </Link>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
        ))}
      </nav>

      <div className="nav-actions">
        <Link className="btn btn-small btn-outline" to="/schedule">Schedule</Link>
        <Link className="btn btn-small btn-gold" to="/shop">Adopt</Link>
        <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open navigation menu">
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>{item.label}</NavLink>
          ))}
          <NavLink to="/schedule" onClick={() => setOpen(false)}>Schedule a Call</NavLink>
          <NavLink to="/shop" onClick={() => setOpen(false)} className="mobile-cta">Adopt a Creation</NavLink>
        </div>
      )}
    </header>
  )
}
