import React from 'react';
import { Link } from 'react-router-dom';
import { mvpPilotProducts } from '../data/mvpPilotProducts.js';
import './LiftedSinaPages.css';

const navItems = [
  ['Our Story', '/story'],
  ['Collections', '/collections'],
  ['Collaborate', '/collaborate'],
  ['Wholesale', '/wholesale'],
  ['Shop', '/shop'],
];

function Header() {
  return (
    <header className="ls-header">
      <Link to="/" className="ls-logo">Sina<span>’s</span></Link>
      <nav className="ls-nav" aria-label="Main navigation">
        {navItems.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
      </nav>
      <div className="ls-actions">
        <Link className="ls-btn ls-btn-outline" to="/schedule">Schedule</Link>
        <Link className="ls-btn ls-btn-gold" to="/shop">Adopt</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="ls-footer">
      <div>
        <Link to="/" className="ls-logo">Sina<span>’s</span></Link>
        <p>One-of-one fused glass creations by Thomasina Schnepf.</p>
        <em>She sees what others miss.</em>
      </div>
      <div>
        <h4>Navigate</h4>
        {navItems.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
      </div>
      <div>
        <h4>Get Involved</h4>
        <Link to="/collaborate">Community Collaborations</Link>
        <Link to="/wholesale">Wholesale & Galleries</Link>
        <Link to="/schedule">Schedule a Conversation</Link>
      </div>
      <div>
        <h4>Join Us</h4>
        <p>Adopt a creation, commission a piece, or help bring Sina’s story to more people.</p>
        <Link className="ls-btn ls-btn-gold" to="/shop">View Available Pieces</Link>
      </div>
    </footer>
  );
}

export function Layout({ children }) {
  return <><Header />{children}<Footer /></>;
}

function HeroBlock({ eyebrow, title, body, children, dark = true }) {
  return (
    <section className={dark ? 'ls-hero ls-dark' : 'ls-hero ls-light'}>
      <div className="ls-wrap">
        <p className="ls-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="ls-lead">{body}</p>
        {children}
      </div>
    </section>
  );
}

export function Home() {
  return (
    <main>
      <HeroBlock
        eyebrow="One-of-one glass art. One-of-one story."
        title="Every creation has a name. Every adoption has a purpose."
        body="Sina’s Creations is the public home for Thomasina Schnepf’s fused glass work: a mission-driven art adoption experience built around story, beauty, community, and care."
      >
        <div className="ls-cta-row">
          <Link className="ls-btn ls-btn-gold" to="/shop">Adopt a Creation</Link>
          <Link className="ls-btn ls-btn-outline" to="/story">Meet Thomasina</Link>
        </div>
      </HeroBlock>

      <section className="ls-section ls-light">
        <div className="ls-two-col">
          <div>
            <p className="ls-eyebrow">The mission</p>
            <h2>She sees what others miss.</h2>
            <p>At age four, a tumor on Thomasina’s optic nerve changed the way she sees the world. What could have ended her creativity became part of her method. She works close to the glass, noticing texture, color, edges, and light most people pass by.</p>
            <p>Her creations are not mass-produced products. Each one is named, numbered, photographed, cataloged, and released once.</p>
          </div>
          <div className="ls-card-grid">
            <div className="ls-feature-card"><strong>1 Physical Piece</strong><span>No duplicates.</span></div>
            <div className="ls-feature-card"><strong>1 Human Name</strong><span>Each creation is treated like a child leaving home.</span></div>
            <div className="ls-feature-card"><strong>1 Strict SKU</strong><span>The catalog protects the one-of-one promise.</span></div>
            <div className="ls-feature-card"><strong>1 Adoption Path</strong><span>Story, image, price, and checkout stay connected.</span></div>
          </div>
        </div>
      </section>

      <section className="ls-section ls-dark">
        <div className="ls-wrap">
          <p className="ls-eyebrow">Founding collection</p>
          <h2>Available for adoption.</h2>
          <div className="ls-products-mini">
            {mvpPilotProducts.slice(0, 6).map((item) => (
              <Link to="/shop" className="ls-product-mini" key={item.sku}>
                <span>{item.sku}</span>
                <strong>{item.name}</strong>
                <em>${item.price}</em>
              </Link>
            ))}
          </div>
          <Link className="ls-btn ls-btn-gold" to="/shop">See the Collection</Link>
        </div>
      </section>
    </main>
  );
}

export function Story() {
  return (
    <main>
      <HeroBlock eyebrow="Our story" title="Thomasina Schnepf sees the world differently." body="Sina’s Creations is built around Thomasina’s story, her faith, her glass, and her desire to create work that gives back." />
      <section className="ls-section ls-light"><div className="ls-two-col"><div><h2>The art is the evidence.</h2><p>Thomasina works closer to her materials than most people ever would. She studies the surface, color, edge, texture, and shimmer until each piece tells her what it wants to become.</p><p>The result is not generic jewelry or decor. It is a body of named one-of-one creations that carry her point of view into the world.</p></div><div className="ls-quote">“My loss of sight, while distorting my vision of your world, has caused me to examine everything much more closely in order to see what is truly there.”<br /><span>— Thomasina Schnepf</span></div></div></section>
    </main>
  );
}

export function Collections() {
  const categories = ['Pendants', 'Wire-Wrapped Pendants', 'Necklaces', 'Ocean Necklaces', 'Lanyards', 'Plates', 'Plaques & Wall Art', 'Sets'];
  return (
    <main>
      <HeroBlock eyebrow="Collections" title="The founding adoption categories." body="The collection structure mirrors the SKU system: each category protects inventory control while still feeling human and story-driven." />
      <section className="ls-section ls-light"><div className="ls-collection-tabs">{categories.map((c) => <span key={c}>{c}</span>)}</div><div className="ls-card-grid">{categories.map((c) => <div className="ls-feature-card" key={c}><strong>{c}</strong><span>One-of-one creations selected, named, priced, and prepared for adoption.</span></div>)}</div></section>
    </main>
  );
}

export function Collaborate() {
  return (
    <main>
      <HeroBlock eyebrow="Collaboration model" title="Organizations, communities, and causes." body="Sina’s Creations can support churches, disability groups, schools, galleries, and community organizations that want art to carry a deeper story." />
      <section className="ls-section ls-light"><div className="ls-two-col"><div><p className="ls-eyebrow">How it works</p><h2>Every collaboration starts with one question.</h2><blockquote>Who are we trying to inspire?</blockquote><p>From charity auctions to awareness campaigns, a Sina collaboration can pair one-of-one art with story, QR codes, events, and community giving.</p></div><FormCard title="Request a Collaboration Concept" button="Submit" /></div></section>
    </main>
  );
}

export function Wholesale() {
  return (
    <main>
      <HeroBlock eyebrow="Wholesale" title="Carry Sina’s Creations in your store or gallery." body="For boutiques, galleries, gift shops, church stores, and community partners interested in carrying one-of-one fused glass art." />
      <section className="ls-section ls-light"><FormCard title="Wholesale Inquiry" button="Submit Inquiry" wide /></section>
    </main>
  );
}

export function Shop() {
  return (
    <main>
      <HeroBlock eyebrow="Adoption catalog" title="The founding MVP collection." body="Each card represents one physical creation. When the Shopify links are connected, each card will route to the matching checkout path." />
      <section className="ls-section ls-light"><div className="ls-shop-grid">{mvpPilotProducts.map((item) => <article className="ls-shop-card" key={item.sku}><div className="ls-shop-img">{item.image ? <img src={item.image} alt={item.name} /> : <span>Image pending</span>}</div><div><p className="ls-eyebrow">{item.sku}</p><h3>{item.name}</h3><p>{item.subtitle}</p><strong>${item.price}</strong><p className="ls-small">{item.description}</p></div></article>)}</div></section>
    </main>
  );
}

export function Schedule() {
  return (
    <main>
      <HeroBlock eyebrow="Let’s talk" title="Schedule a Sina’s Creations conversation." body="Choose the type of conversation that fits the next step: adoption, collaboration, wholesale, commission, or general project planning." />
      <section className="ls-section ls-light"><div className="ls-two-col"><div className="ls-list"><h2>What would you like to discuss?</h2>{['Adoption question', 'Commission request', 'Wholesale or gallery inquiry', 'Community collaboration', 'General founder call'].map((x) => <div className="ls-list-card" key={x}>{x}</div>)}</div><FormCard title="Book Your Conversation" button="Submit" /></div></section>
    </main>
  );
}

function FormCard({ title, button }) {
  return <form className="ls-form"><h3>{title}</h3><input placeholder="First name" /><input placeholder="Last name" /><input placeholder="Email" /><input placeholder="Phone" /><input placeholder="Organization / interest" /><textarea placeholder="Tell us what you have in mind" /><button className="ls-btn ls-btn-gold" type="button">{button}</button></form>;
}

export function NotFound() {
  return <main><HeroBlock eyebrow="Not found" title="This page is still being shaped." body="Use the navigation to return to the current Sina’s Creations structure." /></main>;
}
