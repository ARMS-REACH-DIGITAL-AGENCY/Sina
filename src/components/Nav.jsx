import React, { useState, useEffect } from 'react';
import './Nav.css';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="nav__inner">
        <a href="/" className="nav__logo">
          <span className="nav__logo-sina">Sina's</span>
          <span className="nav__logo-creations">Creations</span>
        </a>

        <ul className={`nav__links ${menuOpen ? 'nav__links--open' : ''}`}>
          <li><a href="#creations" onClick={() => setMenuOpen(false)}>The Creations</a></li>
          <li><a href="#artist" onClick={() => setMenuOpen(false)}>About Thomasina</a></li>
          <li><a href="#commission" onClick={() => setMenuOpen(false)}>Custom Orders</a></li>
          <li>
            <a href="#contact" className="nav__cta" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
          </li>
        </ul>

        <button
          className={`nav__burger ${menuOpen ? 'nav__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
