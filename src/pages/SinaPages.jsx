import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { products, collections } from '../data/products.js';
import LivingMosaic from '../components/LivingMosaic/LivingMosaic.jsx';

const logoBlackPath = '/assets/brand/sinas-creations-black-logo.png';
const logoWhitePath = '/assets/brand/sinas-creations-white-logo.png';

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand logo-brand" to="/" onClick={close} aria-label="Sina's Creations home">
          <img className="brand-logo" src={logoBlackPath} alt="Sina's Creations" />
          <span className="brand-fallback" aria-hidden="true"><span>Sina</span><small>Creations</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/story">Our Story</NavLink>
          <NavLink to="/collections">Collections</NavLink>
          <NavLink to="/collaborate">Collaborate</NavLink>
          <NavLink to="/wholesale">Wholesale</NavLink>
          <NavLink to="/shop">Shop</NavLink>
        </nav>
        <Link className="nav-cta" to="/shop">Adopt</Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
          <span className={open ? 'x' : ''}></span>
          <span className={open ? 'x' : ''}></span>
          <span className={open ? 'x' : ''}></span>
        </button>
      </header>
      {open && (
        <div className="mobile-menu">
          <NavLink onClick={close} to="/story">Our Story</NavLink>
          <NavLink onClick={close} to="/collections">Collections</NavLink>
          <NavLink onClick={close} to="/collaborate">Collaborate</NavLink>
          <NavLink onClick={close} to="/wholesale">Wholesale</NavLink>
          <NavLink onClick={close} to="/shop">Shop</NavLink>
          <NavLink onClick={close} to="/schedule">Schedule a Call</NavLink>
          <Link onClick={close} className="mobile-adopt" to="/shop">Adopt a Creation</Link>
        </div>
      )}
      {children}
      <Footer />
    </div>
  );
}

function Hero({ eyebrow, title, copy, primary = 'Adopt a Creation', primaryTo = '/shop', secondary, secondaryTo = '/story' }) {
  return (
    <section className="hero hero-dark">
      <div className="hero-inner">
        {eyebrow && <div className="pill-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{copy}</p>
        <div className="hero-actions">
          <Link className="button primary" to={primaryTo}>{primary}</Link>
          {secondary && <Link className="button ghost" to={secondaryTo}>{secondary}</Link>}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, copy }) {
  return (
    <div className="section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

export function Home() {
  return (
    <Layout>
      <LivingMosaic />
      <section className="cream-section split-section">
        <div>
          <SectionHeader eyebrow="The Mission" title="More than jewelry. A story you can hold." />
          <p>Every creation begins as glass, but it becomes something more personal once Thomasina names it. Each piece is made by hand, chosen with intention, and offered to one person who feels connected to its color, texture, and story.</p>
          <div className="tag-row"><span>Named once</span><span>Made by hand</span><span>Adopted once</span></div>
        </div>
        <div className="feature-card dark-card">
          <span>1 of 1</span>
          <h3>Each creation waits for the person it was meant to find.</h3>
          <p>When a piece is adopted, it leaves Thomasina's hands and begins its next story in a new home.</p>
        </div>
      </section>
      <FeaturedProducts />
      <CTA title="Ready to meet the collection?" copy="Explore the first available pieces and choose the creation that speaks to you." />
    </Layout>
  );
}

export function Story() {
  return (
    <Layout>
      <Hero eyebrow="Our Story" title="The artist who works closer than sight." copy="At age four, a tumor changed how Thomasina sees the world. What could have ended her art became part of her gift." primary="See the Collection" primaryTo="/collections" />
      <section className="cream-section story-grid">
        <div className="portrait-card"><img src="/images/thomasina.jpg" alt="Thomasina Schnepf" /></div>
        <div>
          <SectionHeader eyebrow="Thomasina Schnepf" title="Her art begins where most people stop looking." />
          <p>Thomasina works close to her glass, noticing edges, seams, texture, and color shifts that others might miss at a glance. Her creations carry the evidence of that attention: layered materials, tactile choices, and details that reward close attention.</p>
          <p>She does not make pieces to be repeated. She creates individual works that can be worn, displayed, gifted, collected, and remembered.</p>
        </div>
      </section>
    </Layout>
  );
}

export function Collections() {
  return (
    <Layout>
      <Hero eyebrow="The Collections" title="One body of work. Many ways to adopt." copy="Pendants, wire-wrapped pieces, necklaces, plaques, plates, wall art, lanyards, and sets — each one made by hand and released as its own original creation." primary="Shop Available Pieces" primaryTo="/shop" />
      <section className="cream-section collection-grid">
        {collections.filter(c => c !== 'All').map((name) => (
          <Link className="collection-card" to={`/shop?collection=${encodeURIComponent(name)}`} key={name}>
            <span>{name}</span>
            <strong>View pieces →</strong>
          </Link>
        ))}
      </section>
    </Layout>
  );
}

export function Collaborate() {
  return (
    <Layout>
      <Hero eyebrow="Community & Collaboration" title="Art with a story can bring people together." copy="Sina's Creations welcomes conversations with churches, schools, galleries, disability-awareness groups, charity events, and community partners who want art to carry a deeper message." primary="Request a Conversation" primaryTo="/schedule" />
      <FormPage title="Start a collaboration conversation" intro="Tell us about the audience, cause, occasion, or community you want to support." />
    </Layout>
  );
}

export function Wholesale() {
  return (
    <Layout>
      <Hero eyebrow="Wholesale" title="Carry Sina's Creations in your store." copy="Retailers, galleries, boutiques, and community partners can apply to carry selected 1 of 1 creations, adoption cards, and story-based displays." primary="Apply for Wholesale" primaryTo="/schedule" />
      <FormPage title="Wholesale application" intro="Tell us about your store, gallery, boutique, or event space and the type of pieces you would like to carry." wholesale />
    </Layout>
  );
}

export function Shop() {
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? products : products.filter(p => p.category === filter);
  return (
    <Layout>
      <Hero eyebrow="Available for Adoption" title="The first release is ready to meet you." copy="Each piece shown here is handmade, named, priced, and available as a 1 of 1 creation." primary="Ask About a Piece" primaryTo="/schedule" />
      <section className="shop-section">
        <div className="tabs" role="tablist" aria-label="Filter products by collection">
          {collections.map(tab => <button key={tab} className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}</button>)}
        </div>
        <div className="product-grid">
          {visible.map(product => <ProductCard product={product} key={product.sku} />)}
        </div>
      </section>
    </Layout>
  );
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-image"><img src={product.image} alt={`${product.name}, ${product.category} by Sina's Creations`} /></div>
      <div className="product-body">
        <div className="sku-row"><span>{product.category}</span><strong>1 of 1</strong></div>
        <h3>{product.name}</h3>
        <p>{product.line}</p>
        <div className="price-row"><span>Adoption price</span><strong>${product.price}</strong></div>
        <Link className="small-link" to="/schedule">Ask about this piece →</Link>
      </div>
    </article>
  );
}

function FeaturedProducts() {
  return (
    <section className="cream-section">
      <SectionHeader eyebrow="Available Now" title="Featured pieces ready for adoption" copy="Begin with a few of the creations currently available from Thomasina's first release." />
      <div className="product-grid compact">
        {products.slice(0, 3).map(product => <ProductCard product={product} key={product.sku} />)}
      </div>
    </section>
  );
}

export function Schedule() {
  return (
    <Layout>
      <Hero eyebrow="Let's Talk" title="Schedule a Sina's Creations conversation." copy="Ask about an available piece, request a custom commission, explore wholesale, or start a collaboration conversation." primary="View Shop" primaryTo="/shop" />
      <FormPage title="Book your conversation" intro="Send the details and we will follow up with the right next step." />
    </Layout>
  );
}

function FormPage({ title, intro, wholesale = false }) {
  return (
    <section className="cream-section form-layout">
      <div>
        <SectionHeader eyebrow="Start Here" title={title} copy={intro} />
        <div className="option-list">
          {['Adoption inquiry', 'Custom commission', 'Collaboration', 'Wholesale', 'Community event', 'General question'].map(item => <div key={item}>{item}</div>)}
        </div>
      </div>
      <form className="lead-form">
        <label>First name<input placeholder="First name" /></label>
        <label>Last name<input placeholder="Last name" /></label>
        <label>Email<input placeholder="you@email.com" /></label>
        <label>Phone<input placeholder="(555) 000-0000" /></label>
        {wholesale && <label>Business name<input placeholder="Business or gallery" /></label>}
        <label>Interest<select defaultValue=""><option value="" disabled>Select one...</option><option>Adoption</option><option>Wholesale</option><option>Collaboration</option><option>Commission</option></select></label>
        <label className="full">Message<textarea placeholder="Tell us what you have in mind..." /></label>
        <button type="button" className="button primary form-button">Submit</button>
      </form>
    </section>
  );
}

function CTA({ title, copy }) {
  return (
    <section className="dark-cta">
      <h2>{title}</h2>
      <p>{copy}</p>
      <Link className="button primary" to="/shop">Adopt a Creation</Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <img className="footer-logo" src={logoWhitePath} alt="Sina's Creations" />
        <p>1 of 1 fused glass art. Named, made by hand, and adopted once.</p>
      </div>
      <div><h4>Navigate</h4><Link to="/story">Our Story</Link><Link to="/collections">Collections</Link><Link to="/shop">Shop</Link></div>
      <div><h4>Get Involved</h4><Link to="/collaborate">Collaborate</Link><Link to="/wholesale">Wholesale</Link><Link to="/schedule">Schedule</Link></div>
      <div><h4>Adopt</h4><p>Choose a piece, ask a question, or start a custom conversation.</p><Link className="button primary footer-button" to="/shop">Adopt</Link></div>
    </footer>
  );
}

export function NotFound() {
  return (
    <Layout>
      <Hero eyebrow="Not Found" title="This page is still being created." copy="Use the navigation to return to the active Sina's Creations pages." primary="Go Home" primaryTo="/" />
    </Layout>
  );
}
