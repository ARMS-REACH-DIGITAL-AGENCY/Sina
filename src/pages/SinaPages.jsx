import React, { useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const logoWhite = '/assets/brand/sinas-creations-white-logo.png'
const logoBlack = '/assets/brand/sinas-creations-black-logo.png'

const janeGallery = [
  {
    src: '/images/products/pnd-sm-183/pnd-sm-183-lifestyle-close.webp',
    fallback: '/images/products/183.JPG',
    label: 'Worn close-up',
  },
  {
    src: '/images/products/pnd-sm-183/pnd-sm-183-silk.webp',
    fallback: '/images/products/183.JPG',
    label: 'Silk presentation',
  },
  {
    src: '/images/products/pnd-sm-183/pnd-sm-183-ready-to-ship.webp',
    fallback: '/images/products/183.JPG',
    label: 'Ready to ship',
  },
  {
    src: '/images/products/pnd-sm-183/pnd-sm-183-detail.webp',
    fallback: '/images/products/183.JPG',
    label: 'Macro detail',
  },
  {
    src: '/images/products/pnd-sm-183/pnd-sm-183-lifestyle-portrait.webp',
    fallback: '/images/products/183.JPG',
    label: 'Lifestyle portrait',
  },
]

const mvpProducts = [
  {
    sku: 'PND-SM-183',
    name: 'Jane',
    category: 'Pendants',
    size: 'Small',
    price: 75,
    image: '/images/products/183.JPG',
    hero: janeGallery[0],
    line: 'Bold as Sunshine, Sharp as Style',
    description:
      'This striking arrowhead-shaped pendant layers deep black glass against vivid sunflower yellow, with a smaller black triangular focal piece nested at the center like a gem in its setting.',
    materials: 'Fused glass, dichroic accents, silver-toned bail, chain included',
    colors: ['Sunshine yellow', 'Jet black', 'Iridescent purple hints'],
  },
  { sku: 'PND-MD-240', name: 'Renee', category: 'Pendants', size: 'Medium', price: 75, image: '/images/products/240.JPG', line: 'Desert Stripes Meet Ocean Shimmer', description: 'Warm amber and sage stripes meet a diamond-set teal focal panel that catches light like sun on water.' },
  { sku: 'PND-WW-SM-65', name: 'Vicki', category: 'Wire Wrapped', size: 'Small', price: 85, image: '/images/products/65.JPG', line: 'Silver Frost Meets a Rainbow Storm', description: 'A frosted white base, silver dichroic shimmer, violet glass, teal texture, and hand-twisted wire come together with wild polished energy.' },
  { sku: 'PND-WW-MD-170', name: 'Greta', category: 'Wire Wrapped', size: 'Medium', price: 55, image: '/images/products/170.JPG', line: 'Cool Water Caught in Silver', description: 'Soft aqua seafoam glass held by silver wire wrapping that follows the organic shape rather than hiding it.' },
  { sku: 'NKL-166', name: 'Celeste Maxima', category: 'Necklaces', size: 'Statement', price: 225, image: '/images/products/166.JPG', line: 'She Was Too Much for One Panel', description: 'Electric pink-magenta crackle dichroic glass on a hand-beaded necklace that reads like a declaration.' },
  { sku: 'NKLO-82', name: 'Anne', category: 'Ocean Necklaces', size: 'Set', price: 145, image: '/images/products/82.JPG', line: 'She Leaps Where the Deep Water Sings', description: 'An orca-inspired fused-glass focal piece with sea-life details and matching dangle earrings.' },
  { sku: 'LNY-36', name: 'Toby', category: 'Lanyards', size: 'One size', price: 75, image: '/images/products/36.JPG', line: 'She Turns the Everyday Into a Little Ceremony', description: 'A hand-beaded lanyard in black, garnet, amber, and gold tones for daily carry that refuses to be ordinary.' },
  { sku: 'PLQ-FG-MD-67', name: 'Judith', category: 'Wall Art', size: 'Medium', price: 120, image: '/images/products/67.JPG', line: 'Four Textures, One Brilliant Story', description: 'A square fused-glass art piece built from distinct dichroic textures over a clean glass base.' },
  { sku: 'PLQ-FG-LG-45', name: 'Justina', category: 'Wall Art', size: 'Large', price: 325, image: '/images/products/45.JPG', line: 'She Holds a Whole Celebration in One Frame', description: 'A large framed fused-glass wall piece with layered geometry, soft white and blue structure, and joyful color accents.' },
  { sku: 'PLT-FG-31', name: 'Ashley', category: 'Plates', size: 'Plate', price: 95, image: '/images/products/31.JPG', line: 'Quiet Smoke, Soft Light, Steady Grace', description: 'A smoky gray marbled fused-glass plate with softly raised edges and a calm, elegant presence.' },
  { sku: 'SET-NKL-EAR-BRA-37', name: 'Farah', category: 'Sets', size: 'Three-piece set', price: 185, image: '/images/products/37.JPG', line: 'Playful, Polished, and a Little Bit Mischief', description: 'A coordinated necklace, earrings, and bracelet set built around warm amber, black beads, gold accents, and a sweet cat focal piece.' },
]

const collectionTabs = ['All', 'Pendants', 'Wire Wrapped', 'Necklaces', 'Ocean Necklaces', 'Lanyards', 'Plates', 'Wall Art', 'Sets']
const navLinks = [
  ['/', 'Home'],
  ['/story', 'About'],
  ['/collections', 'Gallery'],
  ['/story', 'The Artist'],
  ['/shop', 'Adopt'],
  ['/schedule', 'Contact'],
]

function AssetImage({ src, fallback, alt, className = '', ...props }) {
  const [current, setCurrent] = useState(src || fallback)
  return (
    <img
      className={className}
      src={current}
      alt={alt}
      onError={() => fallback && current !== fallback && setCurrent(fallback)}
      {...props}
    />
  )
}

function BrandWordmark({ dark = false }) {
  return (
    <Link className={`wordmark ${dark ? 'wordmark-dark' : ''}`} to="/" aria-label="Sina's Creations home">
      <img src={dark ? logoBlack : logoWhite} alt="Sina's Creations" onError={(event) => { event.currentTarget.style.display = 'none' }} />
      <span className="wordmark-fallback">Sina's <small>Creations</small></span>
    </Link>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <div className="brand-banner">
        <span></span>
        <div>
          <strong>Sina's Creations</strong>
          <small>One-of-one fused glass art. Made with heart.</small>
        </div>
        <span></span>
      </div>
      <header className="site-header-card">
        <BrandWordmark />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map(([to, label]) => (
            <NavLink key={`${to}-${label}`} to={to} onClick={close} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <Link className="adopt-pill" to="/shop" onClick={close}>Adopt <span>♡</span></Link>
        <button className="mobile-menu-button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((value) => !value)}>
          <span></span><span></span><span></span>
        </button>
      </header>
      {open && (
        <nav className="mobile-menu-panel" aria-label="Mobile navigation">
          {navLinks.map(([to, label]) => <NavLink key={`${to}-${label}-mobile`} to={to} onClick={close} end={to === '/'}>{label}</NavLink>)}
          <Link className="mobile-adopt" to="/shop" onClick={close}>Adopt a Piece</Link>
        </nav>
      )}
    </>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <BrandWordmark />
        <p>One-of-one fused glass art by Thomasina Schnepf. Every piece is handmade, named, and released once.</p>
      </div>
      <div>
        <h4>Navigate</h4>
        <Link to="/story">About Thomasina</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/shop">Adopt</Link>
        <Link to="/wholesale">Wholesale</Link>
      </div>
      <div>
        <h4>Get Involved</h4>
        <Link to="/collaborate">Collaborate</Link>
        <Link to="/schedule">Request a Commission</Link>
        <Link to="/shop">View Available Pieces</Link>
      </div>
      <div>
        <h4>Contact</h4>
        <a href="tel:4804476002">(480) 447-6002</a>
        <a href="mailto:sinasartisticcreations@gmail.com">sinasartisticcreations@gmail.com</a>
      </div>
    </footer>
  )
}

function PageShell({ children }) {
  return (
    <div className="sina-site">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

function ButtonRow({ secondary = true }) {
  return (
    <div className="button-row">
      <Link className="button button-primary" to="/shop">Adopt a Piece <span>♡</span></Link>
      {secondary && <Link className="button button-secondary" to="/story">Meet Thomasina</Link>}
    </div>
  )
}

function Hero() {
  return (
    <section className="home-hero">
      <div className="hero-copy-panel">
        <h1>One-of-one fused glass art.</h1>
        <p className="script-line">She sees what others miss.</p>
        <div className="fine-rule"><span></span></div>
        <p>Every piece begins with a spark of inspiration and becomes a story only glass can tell.</p>
        <ButtonRow secondary={false} />
      </div>
      <div className="hero-portrait-panel">
        <AssetImage src="/images/thomasina.jpg" fallback="/images/thomasina.jpg" alt="Thomasina Schnepf holding one-of-one fused glass art" />
      </div>
    </section>
  )
}

function PromiseStrip() {
  return (
    <section className="promise-strip" aria-label="Brand promises">
      <div><span>♡</span><strong>One-of-one art</strong><small>Never repeated.</small></div>
      <div><span>✋</span><strong>Made by hand</strong><small>Created with intention.</small></div>
      <div><span>✧</span><strong>Made with heart</strong><small>Named and released once.</small></div>
      <div><span>□</span><strong>Ships with care</strong><small>Ready to gift.</small></div>
    </section>
  )
}

function MosaicStory() {
  const tiles = useMemo(() => mvpProducts.concat(mvpProducts).slice(0, 18), [])
  return (
    <section className="mosaic-band">
      <div className="mosaic-copy">
        <div className="mini-rule"></div>
        <h2>A portrait built from the collection</h2>
        <p className="script-small">Every tile. Every color. Every detail chosen with intention.</p>
        <p>This is how her story comes together: piece by piece, color by color, into a living catalog of one-of-one creations.</p>
        <Link className="button button-dark-outline" to="/collections">See the Vision <span>→</span></Link>
      </div>
      <div className="mosaic-wall" aria-label="Mosaic made from Sina's Creations pieces">
        {tiles.map((item, index) => (
          <AssetImage
            key={`${item.sku}-${index}`}
            src={item.hero?.src || item.image}
            fallback={item.hero?.fallback || item.image}
            alt={`${item.name} mosaic tile`}
            style={{ '--tile-delay': `${index * 30}ms` }}
          />
        ))}
        <AssetImage className="mosaic-face" src="/images/thomasina.jpg" fallback="/images/thomasina.jpg" alt="Thomasina Schnepf portrait overlay" />
      </div>
    </section>
  )
}

function JaneShowcase({ compact = false }) {
  const jane = mvpProducts[0]
  const [active, setActive] = useState(0)
  const current = janeGallery[active]
  return (
    <section className={compact ? 'jane-showcase compact' : 'jane-showcase'}>
      <div className="product-media-layout">
        <div className="thumb-column">
          {janeGallery.map((image, index) => (
            <button key={image.label} className={active === index ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Show ${image.label}`}>
              <AssetImage src={image.src} fallback={image.fallback} alt={image.label} />
            </button>
          ))}
        </div>
        <div className="main-product-image">
          <AssetImage src={current.src} fallback={current.fallback} alt={`${jane.name} pendant ${current.label}`} />
        </div>
      </div>
      <div className="product-story-panel">
        <p className="breadcrumb">Pendants / Small</p>
        <h2>{jane.name}</h2>
        <p className="sku">{jane.sku}</p>
        <p className="price">${jane.price}</p>
        <h3>{jane.line}</h3>
        <p>{jane.description}</p>
        <p>The glossy finish catches the light with a subtle iridescent shimmer in the black, giving it real depth and dimension.</p>
        <ul className="product-bullets">
          <li>One-of-one original</li>
          <li>Fused glass, handcrafted</li>
          <li>Pendant size: small</li>
          <li>Includes chain</li>
          <li>Shipping included</li>
        </ul>
        <Link className="button button-primary full-width" to="/schedule">Adopt Jane <span>♡</span></Link>
        <small className="ship-note">100% one-of-one. Once adopted, she will not be repeated.</small>
      </div>
    </section>
  )
}

function ProductDetailTabs() {
  return (
    <section className="product-details-section">
      <div className="detail-card">
        <h3>Details</h3>
        <dl>
          <div><dt>Materials</dt><dd>Fused glass, dichroic accents, silver-toned bail and chain</dd></div>
          <div><dt>Colors</dt><dd>Sunshine yellow, jet black, iridescent purple hints</dd></div>
          <div><dt>Size</dt><dd>Small pendant; exact measurements pending physical pass</dd></div>
          <div><dt>Availability</dt><dd>One-of-one. Never repeated.</dd></div>
        </dl>
      </div>
      <div className="detail-card">
        <h3>Artist's Note</h3>
        <p>Jane is bold without being loud. Her yellow glass reads like confidence, while the black center gives her a grounded edge.</p>
      </div>
      <div className="detail-card">
        <h3>Shipping & Care</h3>
        <p>Ships with care after adoption. Keep glass pieces protected from hard impact and store separately from abrasive jewelry.</p>
      </div>
    </section>
  )
}

function SectionIntro({ eyebrow, title, copy }) {
  return (
    <div className="section-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <article className="catalog-product-card">
      <div className="card-image-wrap">
        <AssetImage src={product.hero?.src || product.image} fallback={product.hero?.fallback || product.image} alt={`${product.name} by Sina's Creations`} />
        <span className="card-badge">One of One</span>
      </div>
      <div className="card-body">
        <div className="card-meta"><span>{product.sku}</span><strong>${product.price}</strong></div>
        <h3>{product.name}</h3>
        <p className="card-line">{product.line}</p>
        <p>{product.description}</p>
        <Link to="/schedule">Ask about {product.name} →</Link>
      </div>
    </article>
  )
}

function ProductGrid({ limit }) {
  const list = limit ? mvpProducts.slice(0, limit) : mvpProducts
  return (
    <div className="catalog-grid">
      {list.map((product) => <ProductCard key={product.sku} product={product} />)}
    </div>
  )
}

function PageHero({ eyebrow, title, copy, action = 'Adopt a Piece', to = '/shop' }) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {copy && <p>{copy}</p>}
      <Link className="button button-primary" to={to}>{action}</Link>
    </section>
  )
}

function LeadForm({ title = 'Start the conversation', wholesale = false }) {
  return (
    <form className="lead-form" onSubmit={(event) => event.preventDefault()}>
      <h3>{title}</h3>
      <p>Submit the details and the next step can be handled through the Sina's Creations follow-up workflow.</p>
      <div className="form-grid">
        <label>First name<input placeholder="First name" /></label>
        <label>Last name<input placeholder="Last name" /></label>
        <label>Email<input type="email" placeholder="you@email.com" /></label>
        <label>Mobile phone<input placeholder="(555) 000-0000" /></label>
        {wholesale && <label>Business name<input placeholder="Gallery, store, or organization" /></label>}
        <label>Interest<select defaultValue=""><option value="" disabled>Select one...</option><option>Adopt a piece</option><option>Commission</option><option>Wholesale</option><option>Collaboration</option><option>Community event</option></select></label>
        <label className="full-field">Message<textarea placeholder="Tell us what you have in mind..." /></label>
      </div>
      <button className="button button-form" type="submit">Submit</button>
    </form>
  )
}

export function Home() {
  return (
    <PageShell>
      <Hero />
      <MosaicStory />
      <PromiseStrip />
      <section className="cream-section">
        <SectionIntro eyebrow="Featured Adoption" title="Meet Jane." copy="A real product presentation pattern for every one-of-one creation: editorial imagery, story, details, and a clear adoption path." />
        <JaneShowcase compact />
        <ProductDetailTabs />
      </section>
      <section className="cream-section bordered-top">
        <SectionIntro eyebrow="Available First" title="The MVP release." copy="These first pieces establish the pattern for the full 350-piece catalog: one physical item, one verified image set, one human name, one SKU, one adoption path." />
        <ProductGrid limit={6} />
      </section>
      <section className="signup-bar">
        <div>
          <h2>Be the first to know when a new one-of-one is available.</h2>
          <p>Join the list for future adoptions, commissions, and community releases.</p>
        </div>
        <form onSubmit={(event) => event.preventDefault()}><input placeholder="Email address" /><button>Join the List</button></form>
      </section>
    </PageShell>
  )
}

export function Story() {
  return (
    <PageShell>
      <PageHero eyebrow="The Artist" title="Thomasina Schnepf creates by getting close." copy="Because of her vision, Thomasina works closer to her glass than most people ever would. She sees edges, seams, reflection, and form that others pass by." action="View the Collection" to="/collections" />
      <section className="story-section">
        <div className="story-image"><AssetImage src="/images/thomasina.jpg" fallback="/images/thomasina.jpg" alt="Thomasina Schnepf" /></div>
        <div>
          <p className="eyebrow">Born from a different kind of vision</p>
          <h2>She sees what others miss.</h2>
          <p>Thomasina is legally blind, the result of a tumor on her optic nerve at age four. Her loss of sight changed how she sees the world, but it also shaped the way she creates: slowly, closely, and with intense attention to light and form.</p>
          <p>Her pieces use fused colored glass, glass gems, glass beads, stringers, noodles, texture, and color fields that interact with light in ways that reward close looking.</p>
          <blockquote>“I create and view the world very closely.”</blockquote>
        </div>
      </section>
    </PageShell>
  )
}

export function Collections() {
  return (
    <PageShell>
      <PageHero eyebrow="Gallery" title="One-of-one. Never repeated." copy="The collection is organized by how each creation lives in the world: worn, displayed, gifted, collected, or carried every day." action="Adopt a Creation" to="/shop" />
      <section className="collection-cards-section">
        {collectionTabs.filter((tab) => tab !== 'All').map((tab) => (
          <Link key={tab} className="collection-card" to={`/shop?collection=${encodeURIComponent(tab)}`}>
            <span>{tab}</span>
            <strong>Explore →</strong>
          </Link>
        ))}
      </section>
      <MosaicStory />
    </PageShell>
  )
}

export function Shop() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initial = params.get('collection') || 'All'
  const [filter, setFilter] = useState(collectionTabs.includes(initial) ? initial : 'All')
  const visible = filter === 'All' ? mvpProducts : mvpProducts.filter((item) => item.category === filter)
  return (
    <PageShell>
      <PageHero eyebrow="Adopt" title="Available one-of-one creations." copy="Start with Jane, then explore the MVP release. Shopify checkout will become the transaction layer once the product rows are live." action="Ask About Jane" to="/schedule" />
      <section className="cream-section">
        <JaneShowcase />
        <ProductDetailTabs />
      </section>
      <section className="shop-listing-section">
        <div className="shop-filter-bar">
          {collectionTabs.map((tab) => <button key={tab} className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}</button>)}
        </div>
        {visible.length ? <ProductGrid limit={filter === 'All' ? undefined : visible.length} /> : <p>No pieces in this category yet.</p>}
      </section>
    </PageShell>
  )
}

export function Collaborate() {
  return (
    <PageShell>
      <PageHero eyebrow="Collaborate" title="Community, causes, churches, schools, and events." copy="Sina's Creations can support events and organizations that want art, story, faith, and disability awareness to carry meaning beyond the object itself." action="Start a Collaboration" to="/schedule" />
      <section className="collab-section">
        <div>
          <p className="eyebrow">How it works</p>
          <h2>Every collaboration starts with one question.</h2>
          <blockquote>Who are we trying to lift?</blockquote>
          <p>From charity events to church gatherings, school campaigns, disability-awareness programs, and gallery partnerships, the goal is to make the art support a wider story.</p>
          <div className="topic-grid">{['Church events', 'Disability awareness', 'Gallery partnerships', 'Fundraising releases', 'School programs', 'Caregiver support'].map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <LeadForm title="Request a collaboration concept" />
      </section>
    </PageShell>
  )
}

export function Wholesale() {
  return (
    <PageShell>
      <PageHero eyebrow="Wholesale" title="Carry Sina's Creations in your store." copy="Galleries, boutiques, gift shops, church stores, and community spaces can apply to carry selected one-of-one art and adoption displays." action="Apply for Wholesale" to="/schedule" />
      <section className="collab-section">
        <div>
          <p className="eyebrow">Retail partners</p>
          <h2>Not a generic jewelry rack.</h2>
          <p>The wholesale experience should present each creation with its name, story, SKU, adoption card, and one-of-one promise.</p>
          <div className="topic-grid">{['Galleries', 'Boutiques', 'Gift shops', 'Church stores', 'Museum shops', 'Community events'].map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <LeadForm title="Wholesale application" wholesale />
      </section>
    </PageShell>
  )
}

export function Schedule() {
  return (
    <PageShell>
      <PageHero eyebrow="Contact" title="Tell us what you want to adopt, commission, or explore." copy="Use this page for adoption inquiries, commissions, wholesale, collaborations, and community opportunities." action="View Available Pieces" to="/shop" />
      <section className="collab-section">
        <div>
          <p className="eyebrow">Choose your conversation</p>
          <h2>What would you like to discuss?</h2>
          <div className="conversation-list">
            {['Adopt Jane or another available piece', 'Commission a custom creation', 'Carry Sina’s Creations wholesale', 'Create a community collaboration', 'Invite Thomasina’s story into an event'].map((item) => <div key={item}>{item}</div>)}
          </div>
        </div>
        <LeadForm title="Book your conversation" />
      </section>
    </PageShell>
  )
}

export function NotFound() {
  return (
    <PageShell>
      <PageHero eyebrow="404" title="This piece has not been found." copy="Return to the collection and continue exploring the available creations." action="Back to Shop" to="/shop" />
    </PageShell>
  )
}
