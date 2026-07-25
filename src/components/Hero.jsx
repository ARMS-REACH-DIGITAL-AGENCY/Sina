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
      <div className="hero__orbs" aria-hidden="true" ref={glassRef}>
        <div className="orb orb--teal" />
        <div className="orb orb--amber" />
        <div className="orb orb--violet" />
        <div className="orb orb--crimson" />
      </div>

      <div className="hero__content container">
        <p className="eyebrow reveal reveal-1">One-of-One Fused Glass Art & Jewelry · Chandler, Arizona</p>

        <h1 className="display reveal reveal-2">
          You have to<br />
          <em>get close</em><br />
          to see it.
        </h1>

        <hr className="divider-gold reveal reveal-3" />

        <p className="body-lg hero__sub reveal reveal-3">
          Thomasina Schnepf creates every piece inches from her eyes—studying every color,
          edge, reflection, and seam until it becomes a one-of-one creation with a name,
          a story, and a home still waiting for it.
        </p>

        <p className="body-sm reveal reveal-3" style={{ maxWidth: 620, marginTop: 14 }}>
          Nothing is mass-produced. Nothing is repeated. When a creation is adopted, that exact piece is gone for good.
        </p>

        <div className="hero__actions reveal reveal-4">
          <a href="#shop" className="btn-primary">
            Meet the Creations
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#artist" className="btn-ghost">See How She Sees</a>
        </div>

        <div className="hero__stats reveal reveal-5">
          <div className="hero__stat">
            <span className="hero__stat-num">350+</span>
            <span className="hero__stat-label">Creations Named</span>
          </div>
          <div className="hero__stat-divider" aria-hidden="true" />
          <div className="hero__stat">
            <span className="hero__stat-num">100%</span>
            <span className="hero__stat-label">One of One</span>
          </div>
          <div className="hero__stat-divider" aria-hidden="true" />
          <div className="hero__stat">
            <span className="hero__stat-num">0</span>
            <span className="hero__stat-label">Repeated</span>
          </div>
        </div>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <div className="hero__scroll-line" />
        <span>Get Closer</span>
      </div>
    </section>
  );
}
