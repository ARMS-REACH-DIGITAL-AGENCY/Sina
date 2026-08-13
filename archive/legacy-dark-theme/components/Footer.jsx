import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-sina">Sina's</span>
              <span className="footer__logo-creations">Creations</span>
            </div>
            <p className="footer__tagline">
              Born from a different kind of vision.<br />
              Chandler, Arizona.
            </p>
          </div>

          <div className="footer__links">
            <div className="footer__col">
              <span className="footer__col-title">Navigate</span>
              <ul>
                <li><a href="#shop">Shop</a></li>
                <li><a href="#artist">The Artist</a></li>
                <li><a href="#gallery">Gallery</a></li>
                <li><a href="#commission">Commission</a></li>
              </ul>
            </div>
            <div className="footer__col">
              <span className="footer__col-title">Collections</span>
              <ul>
                <li><a href="#shop">Pendants</a></li>
                <li><a href="#shop">Earrings</a></li>
                <li><a href="#shop">Ornaments</a></li>
                <li><a href="#shop">Plates & Wall Art</a></li>
              </ul>
            </div>
            <div className="footer__col">
              <span className="footer__col-title">Contact</span>
              <ul>
                <li><a href="tel:4804476002">(480) 447-6002</a></li>
                <li><a href="mailto:sinasartisticcreations@gmail.com">Email Thomasina</a></li>
              </ul>
            </div>
          </div>
        </div>

        <hr className="divider footer__divider" />

        <div className="footer__bottom">
          <p className="body-sm">
            © {new Date().getFullYear()} Sina's Creations · Thomasina Schnepf · All rights reserved.
          </p>
          <p className="body-sm footer__legal">
            All sales final · Custom commissions welcome · Each piece is one of one.
          </p>
        </div>
      </div>
    </footer>
  );
}
