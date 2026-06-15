import React, { useEffect, useRef } from 'react';
import './Hero.css';

export default function Hero() {
  const glassRef = useRef(null);

  useEffect(() => {
    const el = glassRef.current;
    if (!el) return;
    const move = (e) => {
      const { clientX, clientY } = e;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (clientX - cx) / cx;
      const dy = (clientY - cy) / cy;
      el.style.transform = `translate(${dx * 18}px, ${dy * 12}px)`;
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <section className="hero">
      {/* Ambient glass orbs — decorative, represent fused glass colors */}
      <div className="hero__orbs" aria-hidden="true" ref={glassRef}>
        <div className="orb orb--teal" />
        <div className="orb orb--amber" />
        <div className="orb orb--violet" />
        <div className="orb orb--crimson" />
      </div>

      <div className="hero__content container">
        <p className="eyebrow reveal reveal-1">Chandler, Arizona · Est. 2010</p>

        <h1 className="display reveal reveal-2">
          Born from a<br />
          <em>different kind</em><br />
          of vision.
        </h1>

        <hr className="divider-gold reveal reveal-3" />

        <p className="body-lg hero__sub reveal reveal-3">
          Thomasina Schnepf has been legally blind since age four.
          She makes glass jewelry by pressing close — closer than anyone
          else ever would — until every color, every edge, every piece
          of light is exactly where it belongs.
        </p>

        <div className="hero__actions reveal reveal-4">
          <a href="#shop" className="btn-primary">
            Explore the Collection
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#artist" className="btn-ghost">Her Story</a>
        </div>

        <div className="hero__stats reveal reveal-5">
          <div className="hero__stat">
            <span className="hero__stat-num">345+</span>
            <span className="hero__stat-label">Pieces Created</span>
          </div>
          <div className="hero__stat-divider" aria-hidden="true" />
          <div className="hero__stat">
            <span className="hero__stat-num">100%</span>
            <span className="hero__stat-label">One of One</span>
          </div>
          <div className="hero__stat-divider" aria-hidden="true" />
          <div className="hero__stat">
            <span className="hero__stat-num">0</span>
            <span className="hero__stat-label">Two Alike</span>
          </div>
        </div>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <div className="hero__scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  );
}
