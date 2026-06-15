import React from 'react';
import './ArtistSection.css';

export default function ArtistSection() {
  return (
    <section className="artist section" id="artist">
      <div className="container">
        <div className="artist__inner">

          {/* Left — visual element */}
          <div className="artist__visual" aria-hidden="true">
            <div className="artist__portrait-frame">
              <div className="artist__portrait-placeholder">
                <div className="artist__portrait-orbs">
                  <div className="a-orb" style={{ background: '#C9A96E', top: '20%', left: '15%' }} />
                  <div className="a-orb" style={{ background: '#1ABC9C', top: '50%', right: '10%' }} />
                  <div className="a-orb" style={{ background: '#7D3C98', bottom: '15%', left: '30%' }} />
                </div>
                <div className="artist__portrait-label">
                  <span>Thomasina</span>
                  <span className="artist__portrait-sub">Place photo here</span>
                </div>
              </div>
            </div>
            <div className="artist__quote-card">
              <blockquote>
                "My loss of sight, while distorting my vision of your world,
                has caused me to examine everything much more closely
                in order to see what is truly there."
              </blockquote>
              <cite>— Thomasina Schnepf</cite>
            </div>
          </div>

          {/* Right — copy */}
          <div className="artist__copy">
            <p className="eyebrow">The Artist</p>
            <h2 className="heading-lg artist__name">
              Thomasina<br />
              <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Schnepf</em>
            </h2>

            <hr className="divider-gold" />

            <p className="body-lg artist__lead">
              At age four, a tumor on her optic nerve changed how Thomasina
              sees the world. What could have ended her — it became her art instead.
            </p>

            <div className="artist__body">
              <p>
                Legally blind, Thomasina works closer to her glass than any
                sighted artist ever would. She presses her face near the surface.
                She examines every edge, every seam, every catch of color.
                The limitation became the method. The method became the signature.
              </p>
              <p>
                Each piece is built with fused colored glass, glass gems, glass beads,
                glass stringers, and glass noodles — materials that only reveal
                their full character when light moves through them.
                She designed her process around that truth.
              </p>
              <p>
                The result is work that couldn't have come from anyone else's hands.
                Not because of the materials. Because of how she sees.
              </p>
            </div>

            <div className="artist__markers">
              <div className="artist__marker">
                <div className="artist__marker-dot" />
                <span>Legally blind since age 4</span>
              </div>
              <div className="artist__marker">
                <div className="artist__marker-dot" />
                <span>Based in Chandler, Arizona</span>
              </div>
              <div className="artist__marker">
                <div className="artist__marker-dot" />
                <span>Every piece hand-crafted and signed</span>
              </div>
              <div className="artist__marker">
                <div className="artist__marker-dot" />
                <span>Custom commissions welcome</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
