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
            <div className="footer__social">
              <a href="https://www.facebook.com/share/191azpAkHC/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/sinasglass?igsh=MTZlbWpoc3dkeTIxNg==" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="https://youtube.com/@sinasglass?si=IjSvrFRol4dghDbB" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"/>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                </svg>
              </a>
              <a href="https://x.com/SinasGlasss" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@sinas.glass?_r=1&_t=ZT-97M0naGC4ly" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M16.6 5.82c-.7-.77-1.1-1.77-1.1-2.82h-3.04v13.36a2.59 2.59 0 11-1.83-2.48V10.8a5.62 5.62 0 105.6 5.62V9.07a7.6 7.6 0 004.37 1.39V7.42a4.85 4.85 0 01-4-1.6z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer__links">
            <div className="footer__col">
              <span className="footer__col-title">Navigate</span>
              <ul>
                <li><a href="#creations">The Creations</a></li>
                <li><a href="#artist">About Thomasina</a></li>
                <li><a href="#commission">Custom Orders</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer__col">
              <span className="footer__col-title">Collections</span>
              <ul>
                <li><a href="#creations">Pendants</a></li>
                <li><a href="#creations">Earrings</a></li>
                <li><a href="#creations">Ornaments</a></li>
                <li><a href="#creations">Plates & Wall Art</a></li>
                <li><a href="#creations">Sina's Glass</a></li>
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
