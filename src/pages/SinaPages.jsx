import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { products, collections } from '../data/products.js';
import LivingMosaic from '../components/LivingMosaic/LivingMosaic.jsx';
import WholesaleApplicationForm from '../components/WholesaleApplicationForm.jsx';

const logoWhitePath = '/assets/brand/sinas-creations-white-logo.png';
const meetSinaSmile = '/images/meet-sina/meet-sina-smile.jpg';
const meetSinaCloseup = '/images/meet-sina/meet-sina-closeup.jpg';
const meetSinaStudio = '/images/meet-sina/meet-sina-studio.jpg';
const meetSinaTray = '/images/meet-sina/meet-sina-tray.jpg';

const primaryNav = [
  { to: '/meet-sina', label: 'Meet Sina' },
  { to: '/creations', label: 'Creations' },
  { to: '/commission', label: 'Commission' },
  { to: '/wholesale', label: 'Wholesale' },
];

const footerNav = [
  { to: '/meet-sina', label: 'Meet Sina' },
  { to: '/creations', label: 'Creations' },
  { to: '/shop', label: 'Adopt' },
];

const footerConnect = [
  { to: '/commission', label: 'Commission' },
  { to: '/wholesale', label: 'Wholesale' },
  { to: '/schedule', label: 'Schedule' },
];

const pageHeroImages = {
  artist: '/images/thomasina.jpg',
  creations: '/images/hero/PLQ-FG-LG-45.JPG',
  commission: '/images/products/111.JPG',
  wholesale: '/images/products/67.JPG',
  shop: '/images/products/103.JPG',
  schedule: '/images/products/100.JPG',
};

const inquiryOptions = ['Adoption', 'Commission', 'Wholesale', 'Meet Sina', 'Gift Question', 'General Question'];

function createInitialFormState(lockedInterest = '') {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    interest: lockedInterest,
    message: '',
  };
}

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand logo-brand" to="/" onClick={close} aria-label="Sina's Creations home">
          <img className="brand-logo" src={logoWhitePath} alt="Sina's Creations" />
          <span className="brand-fallback" aria-hidden="true"><span>Sina</span><small>Creations</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {primaryNav.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
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
          {primaryNav.map((item) => <NavLink key={item.to} onClick={close} to={item.to}>{item.label}</NavLink>)}
          <NavLink onClick={close} to="/schedule">Schedule a Call</NavLink>
          <Link onClick={close} className="mobile-adopt" to="/shop">Adopt a Creation</Link>
        </div>
      )}
      {children}
      <Footer />
    </div>
  );
}

function Hero({
  eyebrow,
  title,
  copy,
  primary = 'Adopt a Creation',
  primaryTo = '/shop',
  secondary,
  secondaryTo = '/meet-sina',
  backgroundImage,
  backgroundPosition = 'center center',
}) {
  const style = backgroundImage
    ? {
        '--hero-background-image': `url(${backgroundImage})`,
        '--hero-background-position': backgroundPosition,
      }
    : undefined;

  return (
    <section className={`hero hero-dark${backgroundImage ? ' hero-with-image' : ''}`} style={style}>
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
      <Hero
        eyebrow="Meet Sina"
        title="The artist behind every 1-of-1 creation."
        copy="Thomasina Schnepf creates by touch, light, color, and close attention. Her work is personal, tactile, and made to be worn, displayed, gifted, and remembered one original at a time."
        primary="See the Creations"
        primaryTo="/creations"
        backgroundImage={pageHeroImages.artist}
        backgroundPosition="78% 32%"
      />
      <section className="cream-section meet-sina-page">
        <div className="meet-sina-message">
          <SectionHeader eyebrow="A Message From the Designer" title="My name is Thomasina Schnepf." />
          <p className="meet-sina-pullquote">I am legally blind, and because of this, I create and &ldquo;view&rdquo; the world &mdash; and my work &mdash; very closely.</p>
          <p>My disability is the result of a tumor on my optic nerve when I was four years old. For most people, vision shapes the way they see the world. For me, the loss of my sight has distorted my view of the world, but it has also caused me to examine everything much more closely in order to &ldquo;see&rdquo; what is truly there.</p>
          <p>It is from this kind of &ldquo;vision&rdquo; that I create my pieces. My artwork is shaped by my experiences, and each piece is intended to convey a part of the way I see and feel the world.</p>
          <p>Forms help me understand and create. They allow me to lay out my designs and guide my hands as I create individual, one-of-a-kind pieces. I need excellent lighting in order to see at all, so light plays an important role in my work.</p>
          <p>Because my view of the world is different, forms are not always separate, distinct, or concrete to me. Together with light and glass, they create fields of color and reflection that interact with one another. Up close, they create a believable world &mdash; one that I can see, feel, and be part of.</p>
          <p>Each unique, one-of-a-kind piece is created using various combinations of fused colored glass, glass gems, glass beads, glass stringers, and glass noodles.</p>
          <p>I hope you enjoy my creations as much as I have enjoyed creating each one especially for you.</p>
          <p className="meet-sina-signoff">God Bless,<br />Sina</p>
        </div>
        <div className="meet-sina-media">
          <article className="meet-sina-photo-card meet-sina-photo-card--portrait">
            <img src={meetSinaSmile} alt="Thomasina Schnepf smiling while working with fused glass pieces." />
          </article>
          <div className="meet-sina-note">
            <span>Working Close</span>
            <h3>Every piece begins with touch, light, patience, and intention.</h3>
            <p>These studio photos show how close Sina works to the glass as she arranges color, shape, and texture into a one-of-one creation.</p>
          </div>
          <div className="meet-sina-media-grid">
            <article className="meet-sina-photo-card">
              <img src={meetSinaCloseup} alt="Close-up of Sina arranging small glass pieces by hand on a blue work tray." />
            </article>
            <article className="meet-sina-photo-card">
              <img src={meetSinaStudio} alt="Wide view of Sina's work table with glass materials, tools, and trays." />
            </article>
            <article className="meet-sina-photo-card meet-sina-photo-card--wide">
              <img src={meetSinaTray} alt="Finished and in-progress fused glass pieces laid out on a blue tray in Sina's studio." />
            </article>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export function Collections() {
  return (
    <Layout>
      <Hero
        eyebrow="1-of-1 Creations"
        title="One body of work. Many ways to adopt."
        copy="Pendants, wire-wrapped pieces, necklaces, plaques, plates, wall art, lanyards, and sets &mdash; each one made by hand and released as its own original creation."
        primary="Shop Available Pieces"
        primaryTo="/shop"
        backgroundImage={pageHeroImages.creations}
        backgroundPosition="78% center"
      />
      <section className="cream-section collection-grid">
        {collections.filter((name) => name !== 'All').map((name) => (
          <Link className="collection-card" to={`/shop?collection=${encodeURIComponent(name)}`} key={name}>
            <span>{name}</span>
            <strong>View pieces &rarr;</strong>
          </Link>
        ))}
      </section>
    </Layout>
  );
}

export function Collaborate() {
  return (
    <Layout>
      <Hero
        eyebrow="Commission"
        title="Begin a custom piece with Sina."
        copy="If you want a piece shaped around a person, memory, color story, or meaning, start the conversation here and we will guide the next step together."
        primary="Start a Commission"
        primaryTo="/schedule"
        backgroundImage={pageHeroImages.commission}
        backgroundPosition="76% 36%"
      />
      <FormPage
        title="Commission inquiry"
        intro="Tell us about the person, palette, occasion, symbolism, or feeling you want the piece to carry."
        lockedInterest="Commission"
      />
    </Layout>
  );
}

export function Wholesale() {
  return (
    <Layout>
      <Hero
        eyebrow="Wholesale"
        title="Carry Sina's Creations in your store."
        copy="Sina's Creations is accepting wholesale applications from boutiques, galleries, gift shops, and community retailers who want one-of-one jewelry and glass art with a personal story behind every piece."
        primary="Start the Application"
        primaryTo="/wholesale#application"
        backgroundImage={pageHeroImages.wholesale}
        backgroundPosition="74% center"
      />
      <WholesaleApplicationForm />
    </Layout>
  );
}

export function Shop() {
  const location = useLocation();
  const queryFilter = React.useMemo(() => {
    const requested = new URLSearchParams(location.search).get('collection');
    return collections.includes(requested) ? requested : 'All';
  }, [location.search]);
  const [filter, setFilter] = useState(queryFilter);

  React.useEffect(() => {
    setFilter(queryFilter);
  }, [queryFilter]);

  const visible = filter === 'All' ? products : products.filter((product) => product.category === filter);

  return (
    <Layout>
      <Hero
        eyebrow="Available for Adoption"
        title="The first release is ready to meet you."
        copy="Each piece shown here is handmade, named, priced, and available as a 1 of 1 creation."
        primary="Ask About a Piece"
        primaryTo="/schedule"
        backgroundImage={pageHeroImages.shop}
        backgroundPosition="78% 42%"
      />
      <section className="shop-section">
        <div className="tabs" role="tablist" aria-label="Filter products by collection">
          {collections.map((tab) => (
            <button key={tab} type="button" className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}</button>
          ))}
        </div>
        <div className="product-grid">
          {visible.map((product) => <ProductCard product={product} key={product.sku} />)}
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
        <Link className="small-link" to="/schedule">Ask about this piece &rarr;</Link>
      </div>
    </article>
  );
}

function FeaturedProducts() {
  return (
    <section className="cream-section">
      <SectionHeader eyebrow="Available Now" title="Featured pieces ready for adoption" copy="Begin with a few of the creations currently available from Thomasina's first release." />
      <div className="product-grid compact">
        {products.slice(0, 3).map((product) => <ProductCard product={product} key={product.sku} />)}
      </div>
    </section>
  );
}

export function Schedule() {
  return (
    <Layout>
      <Hero
        eyebrow="Let's Talk"
        title="Schedule a Sina's Creations conversation."
        copy="Ask about an available piece, request a commission, explore wholesale, or reach out after reading Sina's message."
        primary="View Available Pieces"
        primaryTo="/shop"
        backgroundImage={pageHeroImages.schedule}
        backgroundPosition="74% 34%"
      />
      <FormPage title="Book your conversation" intro="Send the details and we will follow up with the right next step." />
    </Layout>
  );
}

function FormPage({ title, intro, lockedInterest = '' }) {
  const [formState, setFormState] = useState(() => createInitialFormState(lockedInterest));
  const [status, setStatus] = useState({ tone: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.email.trim() && !formState.phone.trim()) {
      setStatus({ tone: 'error', message: 'Please include either an email address or a phone number so we can follow up.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ tone: 'idle', message: '' });

    try {
      const response = await fetch('/api/highlevel/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: formState.interest || lockedInterest || 'General Question',
          firstName: formState.firstName,
          lastName: formState.lastName,
          email: formState.email,
          phone: formState.phone,
          businessName: formState.businessName,
          message: formState.message,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'We could not save your information just yet. Please try again.');
      }

      setFormState(createInitialFormState(lockedInterest));
      setStatus({ tone: 'success', message: result.message || 'Thanks. Your information has been sent and we will follow up soon.' });
    } catch (error) {
      setStatus({ tone: 'error', message: error.message || 'Something went wrong while sending your form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="cream-section form-layout">
      <div>
        <SectionHeader eyebrow="Start Here" title={title} copy={intro} />
        <div className="option-list">
          {['Adoption inquiry', 'Commission', 'Wholesale', 'Meet Sina', 'Gift question', 'General question'].map((item) => <div key={item}>{item}</div>)}
        </div>
      </div>
      <form className="lead-form" onSubmit={handleSubmit}>
        <label>First name<input name="firstName" value={formState.firstName} onChange={handleChange} placeholder="First name" required /></label>
        <label>Last name<input name="lastName" value={formState.lastName} onChange={handleChange} placeholder="Last name" required /></label>
        <label>Email<input name="email" type="email" value={formState.email} onChange={handleChange} placeholder="you@email.com" /></label>
        <label>Phone<input name="phone" value={formState.phone} onChange={handleChange} placeholder="(555) 000-0000" /></label>
        {lockedInterest ? (
          <label>
            Inquiry type
            <input name="interest" value={lockedInterest} readOnly />
          </label>
        ) : (
          <label>
            Interest
            <select name="interest" value={formState.interest} onChange={handleChange} required>
              <option value="" disabled>Select one...</option>
              {inquiryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        )}
        <label className="full">Message<textarea name="message" value={formState.message} onChange={handleChange} placeholder="Tell us what you have in mind..." required /></label>
        <button type="submit" className="button primary form-button" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
        {status.message && <p className={`form-status form-status-${status.tone}`} role="status">{status.message}</p>}
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
      <div>
        <h4>Navigate</h4>
        {footerNav.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
      </div>
      <div>
        <h4>Connect</h4>
        {footerConnect.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
      </div>
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
