import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import LivingMosaicPreview from '../components/LivingMosaicPreview.jsx';

const products = [
  { sku: 'LNY-36', name: 'Toby', category: 'Charms', price: 75, image: '/images/products/36.JPG', line: 'She turns the everyday into a little ceremony.', description: 'A hand-beaded lanyard in deep black, garnet red, amber, and gold tones, finished for daily use as a badge, key, or carry piece.' },
  { sku: 'NKL-166', name: 'Celeste Maxima', category: 'Necklaces', price: 225, image: '/images/products/166.JPG', line: 'She was too much for one panel.', description: 'Two electric pink-magenta dichroic panels set into a complete beaded necklace with black glass frames, iridescent cube beads, and silver accents.' },
  { sku: 'NKLO-82', name: 'Anne', category: 'Ocean Necklaces', price: 145, image: '/images/products/82.JPG', line: 'She leaps where the deep water sings.', description: 'An ocean-style necklace with a fused-glass orca focal and sea-inspired beadwork for someone drawn to deep water and freedom.' },
  { sku: 'PLQ-FG-LG-45', name: 'Justina', category: 'Wall Art', price: 325, image: '/images/products/45.JPG', line: 'She holds a whole celebration in one frame.', description: 'A large framed fused-glass wall piece with layered geometric glass, soft white and blue structure, and raised lines that guide the eye.' },
  { sku: 'PLQ-FG-MD-67', name: 'Judith', category: 'Wall Art', price: 120, image: '/images/products/67.JPG', line: 'Four textures, one brilliant story.', description: 'A fused-glass plaque bringing together ridged purple-pink, black and teal grid, cobalt texture, and bubbled teal-blue glass.' },
  { sku: 'PLT-FG-31', name: 'Ashley', category: 'Plates', price: 95, image: '/images/products/31.JPG', line: 'Quiet smoke, soft light, steady grace.', description: 'A square fused-glass plate with softly raised sides and a smoky gray marbled center drifting from charcoal into white.' },
  { sku: 'PND-MD-240', name: 'Renee', category: 'Pendants', price: 75, image: '/images/products/240.JPG', line: 'Desert stripes meet ocean shimmer.', description: 'A tall rectangular fused-glass pendant with amber and sage striping beneath a diamond-set dichroic focal in teal, violet, copper, and blue-green.' },
  { sku: 'PND-SM-183', name: 'Jane', category: 'Pendants', price: 75, image: '/images/products/183.JPG', line: 'Bold as sunshine, sharp as style.', description: 'A striking arrowhead-shaped pendant that layers deep black glass against vivid sunflower yellow, with a smaller black triangular focal piece at the center.' },
  { sku: 'PND-WW-MD-170', name: 'Greta', category: 'Wire Wrapped', price: 55, image: '/images/products/170.JPG', line: 'Cool water caught in silver.', description: 'A soft aqua-seafoam glass pendant with silver wire wrapping that follows the natural shape without covering the translucent glass.' },
  { sku: 'PND-WW-SM-65', name: 'Vicki', category: 'Wire Wrapped', price: 85, image: '/images/products/65.JPG', line: 'Silver frost meets a rainbow storm.', description: 'A frosted white glass base with silver dichroic sparkle, deep violet glass, magenta-gold-green rainbow glass, and hand-twisted silver wire.' },
  { sku: 'SET-NKL-EAR-BRA-37', name: 'Farah', category: 'Sets', price: 185, image: '/images/products/37.JPG', line: 'Playful, polished, and a little bit mischief.', description: 'A coordinated necklace, earrings, and bracelet set with amber beads, black seed beads, gold-tone accents, and a fused-glass cat focal piece.' },
];

const collections = ['All', 'Pendants', 'Wire Wrapped', 'Necklaces', 'Ocean Necklaces', 'Plates', 'Wall Art', 'Charms', 'Sets'];
const heroImagePath = '/images/thomasina.jpg';
const logoWhitePath = '/assets/brand/sinas-creations-white-logo.png';
const jane = products.find((product) => product.sku === 'PND-SM-183') || products[0];

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="site-shell preview-shell">
      <header className="site-header mockup-header">
        <Link className="brand logo-brand" to="/" onClick={close} aria-label="Sina's Creations home">
          <img className="brand-logo" src={logoWhitePath} alt="Sina's Creations" />
          <span className="brand-fallback" aria-hidden="true"><span>Sina</span><small>Creations</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/story">About</NavLink>
          <NavLink to="/collections">Gallery</NavLink>
          <NavLink to="/collections">Collections</NavLink>
          <NavLink to="/story">The Artist</NavLink>
          <NavLink to="/shop">Adopt</NavLink>
        </nav>
        <Link className="nav-cta" to="/shop">Adopt a Piece ♡</Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
          <span className={open ? 'x' : ''}></span>
          <span className={open ? 'x' : ''}></span>
          <span className={open ? 'x' : ''}></span>
        </button>
      </header>

      {open && (
        <div className="mobile-menu mockup-mobile-menu">
          <NavLink onClick={close} to="/">Home</NavLink>
          <NavLink onClick={close} to="/story">About</NavLink>
          <NavLink onClick={close} to="/collections">Gallery</NavLink>
          <NavLink onClick={close} to="/collections">Collections</NavLink>
          <NavLink onClick={close} to="/story">The Artist</NavLink>
          <NavLink onClick={close} to="/shop">Adopt</NavLink>
          <Link onClick={close} className="mobile-adopt" to="/shop">Adopt a Piece</Link>
        </div>
      )}

      {children}
      <Footer />
    </div>
  );
}

function HomeHero() {
  return (
    <section className="mockup-hero target-home-hero">
      <div className="mockup-hero-copy">
        <span className="mockup-eyebrow">1-of-1 fused glass art</span>
        <h1>1-of-1 fused glass art.</h1>
        <em>She sees what others miss.</em>
        <div className="gold-rule"><span></span></div>
        <p>Every piece begins with a spark of inspiration — and becomes a story only glass can tell.</p>
        <Link className="mockup-adopt-button" to="/shop">Adopt a Piece <span>♡</span></Link>
      </div>
      <div className="mockup-hero-photo" aria-label="Thomasina Schnepf holding a fused glass creation">
        <img src={heroImagePath} alt="Thomasina Schnepf holding one of her fused glass creations" />
      </div>
    </section>
  );
}

function PageHero({ eyebrow, title, copy, button = 'Explore', to = '/shop' }) {
  return (
    <section className="page-hero-simple">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
        <Link to={to}>{button}</Link>
      </div>
    </section>
  );
}

function SignatureStrip() {
  return (
    <section className="signature-strip" aria-label="Sina's Creations promise">
      <div><span>♡</span><strong>1-of-1</strong><small>Never repeated.</small></div>
      <div><span>☝</span><strong>Handcrafted</strong><small>Made by hand.</small></div>
      <div><span>✧</span><strong>Made with heart</strong><small>Created with intention.</small></div>
      <div><span>□</span><strong>Ships with care</strong><small>Ready to gift.</small></div>
    </section>
  );
}

function JaneFeature() {
  return (
    <section className="jane-feature" id="jane">
      <div className="jane-gallery">
        <div className="jane-thumbs">
          <img src={jane.image} alt="Jane pendant thumbnail" />
          <img src={jane.image} alt="Jane pendant alternate thumbnail" />
          <img src={jane.image} alt="Jane pendant detail thumbnail" />
        </div>
        <div className="jane-main-image">
          <img src={jane.image} alt="Jane, PND-SM-183 fused glass pendant" />
        </div>
      </div>
      <div className="jane-copy">
        <span>Pendants / Small</span>
        <h2>{jane.name}</h2>
        <small>{jane.sku}</small>
        <strong>${jane.price}</strong>
        <h3>{jane.line}</h3>
        <p>{jane.description} She is 1-of-1, named, numbered, and released once.</p>
        <ul>
          <li>1-of-1 original</li>
          <li>Fused glass, handcrafted</li>
          <li>Pendant size: small</li>
          <li>Shipping included unless noted otherwise</li>
        </ul>
        <Link className="mockup-adopt-button jane-button" to="/schedule?piece=PND-SM-183">Adopt Jane <span>♡</span></Link>
      </div>
    </section>
  );
}

function FeaturedProducts() {
  return (
    <section className="featured-products">
      <div className="section-header">
        <span>The First Release</span>
        <h2>Available pieces from the local fallback catalog.</h2>
        <p>These cards are temporary until the Shopify catalog becomes the source of truth.</p>
      </div>
      <div className="product-grid">
        {products.slice(0, 6).map((product) => <ProductCard key={product.sku} product={product} />)}
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  return (
    <article className="preview-product-card">
      <img src={product.image} alt={product.name} />
      <div>
        <span>{product.sku}</span>
        <h3>{product.name}</h3>
        <p>{product.line}</p>
        <strong>${product.price}</strong>
        <Link to={`/schedule?piece=${encodeURIComponent(product.sku)}`}>Adopt {product.name}</Link>
      </div>
    </article>
  );
}

function CTA({ title, copy }) {
  return (
    <section className="join-strip">
      <h2>{title}</h2>
      <p>{copy}</p>
      <Link to="/shop">Explore available pieces</Link>
    </section>
  );
}

export function Home() {
  return (
    <Layout>
      <HomeHero />
      <LivingMosaicPreview products={products} />
      <SignatureStrip />
      <JaneFeature />
      <FeaturedProducts />
      <CTA title="Be first to know when a new 1-of-1 creation is available." copy="The full system will connect this visual catalog to live Shopify product data." />
    </Layout>
  );
}

export function Story() {
  return (
    <Layout>
      <PageHero eyebrow="The Artist" title="The artist who works closer than sight." copy="Thomasina's work is shaped by light, touch, form, color, and the way she has learned to see the world closely." button="View the collection" to="/collections" />
      <section className="story-section">
        <img src={heroImagePath} alt="Thomasina Schnepf" />
        <div>
          <span>About Thomasina Schnepf</span>
          <h2>She sees what others miss.</h2>
          <p>At age four, a tumor on her optic nerve changed how she sees the world. Her work now turns that closeness into fused glass pieces that can be held, worn, gifted, and remembered.</p>
          <p>Every piece is created by hand and released once.</p>
        </div>
      </section>
    </Layout>
  );
}

export function Collections() {
  return (
    <Layout>
      <PageHero eyebrow="The Collections" title="One body of work. Many ways to adopt." copy="Browse the first MVP categories and pieces while the Shopify catalog connection is prepared." button="Shop pieces" to="/shop" />
      <section className="collection-grid">
        {collections.filter((item) => item !== 'All').map((collection) => (
          <Link className="collection-card" key={collection} to={`/shop?collection=${encodeURIComponent(collection)}`}>
            <span>{collection}</span>
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
      <PageHero eyebrow="Community" title="Art with a story can bring people together." copy="For churches, schools, galleries, events, and community partners who want Sina's story to support a deeper purpose." button="Start a conversation" to="/schedule" />
      <FormPage title="Start a collaboration conversation" />
    </Layout>
  );
}

export function Wholesale() {
  return (
    <Layout>
      <PageHero eyebrow="Wholesale" title="Carry Sina's Creations in your store." copy="Retailers, galleries, boutiques, and event partners can inquire about carrying selected 1-of-1 creations." button="Apply for wholesale" to="/schedule" />
      <FormPage title="Wholesale inquiry" />
    </Layout>
  );
}

export function Shop() {
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? products : products.filter((product) => product.category === filter);

  return (
    <Layout>
      <PageHero eyebrow="Available for Adoption" title="The first release is ready to meet you." copy="Each piece shown here is handmade, named, priced, and available as a 1-of-1 creation in the local fallback catalog." button="Ask about a piece" to="/schedule" />
      <section className="shop-section">
        <div className="tabs" role="tablist" aria-label="Filter products by collection">
          {collections.map((tab) => <button key={tab} type="button" className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}</button>)}
        </div>
        <div className="product-grid">
          {visible.map((product) => <ProductCard key={product.sku} product={product} />)}
        </div>
      </section>
    </Layout>
  );
}

export function Schedule() {
  return (
    <Layout>
      <PageHero eyebrow="Contact" title="Ask about a piece or a commission." copy="Use this temporary inquiry form while the Shopify checkout connection is being prepared." button="View shop" to="/shop" />
      <FormPage title="Send a message" />
    </Layout>
  );
}

function FormPage({ title }) {
  return (
    <section className="form-section">
      <div>
        <span>Inquiry</span>
        <h2>{title}</h2>
        <p>This visual shell keeps the form simple for now. Final routing can connect to HighLevel or Shopify workflows when ready.</p>
      </div>
      <form>
        <label>First name<input type="text" placeholder="First name" /></label>
        <label>Email<input type="email" placeholder="you@email.com" /></label>
        <label>Message<textarea placeholder="Tell us what you have in mind"></textarea></label>
        <button type="button">Send Message</button>
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Sina's Creations</strong>
        <p>1-of-1 fused glass art. Made with heart.</p>
      </div>
      <nav>
        <Link to="/story">The Artist</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/shop">Adopt</Link>
        <Link to="/schedule">Contact</Link>
      </nav>
    </footer>
  );
}

export function NotFound() {
  return (
    <Layout>
      <PageHero eyebrow="404" title="That page is not available." copy="Return to the collection or the home page." button="Return home" to="/" />
    </Layout>
  );
}
