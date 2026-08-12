import React, { useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { mvpPilotProducts } from './data/mvpPilotProducts'

const categories = [
  { key: 'all', label: 'All' },
  { key: 'pendants', label: 'Pendants' },
  { key: 'sets', label: 'Sets' },
  { key: 'plates', label: 'Plates & Wall Art' },
  { key: 'charms', label: 'Charms' },
]

function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [
    ['/', 'Home'],
    ['/story', 'Our Story'],
    ['/collections', 'Collections'],
    ['/collaborate', 'Collaborate'],
    ['/wholesale', 'Wholesale'],
    ['/shop', 'Shop'],
    ['/schedule', 'Schedule'],
  ]

  return (
    <header className="site-header">
      <Link to="/" className="brand" onClick={() => setOpen(false)}>
        <span className="brand-mark">Sina</span>
        <span className="brand-sub">Creations</span>
      </Link>
      <nav className="desktop-nav">
        {links.slice(1).map(([href, label]) => <NavLink key={href} to={href}>{label}</NavLink>)}
      </nav>
      <div className="nav-actions">
        <Link className="btn btn-outline" to="/schedule">Schedule</Link>
        <Link className="btn btn-gold" to="/shop">Adopt</Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? '×' : '☰'}</button>
      </div>
      {open && (
        <div className="mobile-menu">
          {links.slice(1).map(([href, label]) => <NavLink key={href} to={href} onClick={() => setOpen(false)}>{label}</NavLink>)}
          <Link className="btn btn-gold wide" to="/shop" onClick={() => setOpen(false)}>Adopt a Creation</Link>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <div className="footer-logo">Sina’s Creations</div>
        <p>One-of-one glass art by Thomasina Schnepf.</p>
        <em>Vision is more than eyesight.</em>
      </div>
      <div>
        <h4>Navigate</h4>
        <Link to="/story">Our Story</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/collaborate">Collaborate</Link>
        <Link to="/wholesale">Wholesale</Link>
        <Link to="/shop">Shop</Link>
      </div>
      <div>
        <h4>Get Involved</h4>
        <Link to="/schedule">Schedule a Call</Link>
        <Link to="/collaborate">Community Programs</Link>
        <Link to="/wholesale">Retail / Gallery Inquiry</Link>
      </div>
      <div>
        <h4>Join Us</h4>
        <p>Help bring Sina’s art, story, and mission to the community.</p>
        <Link className="btn btn-gold wide" to="/schedule">Start the Conversation</Link>
      </div>
    </footer>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="pill">One-of-one fused glass art</div>
        <h1>She sees what others miss.</h1>
        <p>Art, jewelry, and community work by Thomasina Schnepf — a legally blind artist turning glass, color, texture, and faith into pieces that are named, numbered, and adopted once.</p>
        <div className="hero-actions">
          <Link className="btn btn-gold large" to="/shop">Adopt a Creation</Link>
          <Link className="btn btn-ghost large" to="/story">Meet Thomasina</Link>
        </div>
      </div>
      <div className="hero-art">
        <div className="portrait-card">
          <img src="/images/thomasina.jpg" alt="Thomasina Schnepf with her artwork" />
        </div>
      </div>
    </section>
  )
}

function Home() {
  return (
    <>
      <Hero />
      <section className="mission dark-section">
        <p className="eyebrow">The Mission</p>
        <h2>Each creation carries a story. Each adoption helps the mission move.</h2>
        <div className="two-cards">
          <article>
            <h3>The Internal Lift</h3>
            <p>Thomasina’s process is slow, close, tactile, and intentional. She works near the glass, where light and texture tell her what the piece wants to become.</p>
          </article>
          <article>
            <h3>The External Lift</h3>
            <p>When someone adopts a piece, they are not buying inventory. They are carrying forward Sina’s story, faith, resilience, and creative independence.</p>
          </article>
        </div>
        <div className="tag-row">
          <span>“Vision is more than eyesight.”</span>
          <span>“Each one has a name.”</span>
          <span>“When it’s gone, it’s gone.”</span>
        </div>
      </section>
      <CollectionsPreview />
      <CTA />
    </>
  )
}

function Story() {
  return (
    <>
      <PageHero eyebrow="Our Story" title="The art began where ordinary vision ended." text="Thomasina has been legally blind since childhood. Her work is built from the way she actually sees: close, textural, patient, and intimate." />
      <section className="split-section">
        <div>
          <p className="eyebrow">The Artist</p>
          <h2>Thomasina Schnepf</h2>
          <p>At age four, a tumor on her optic nerve changed how Thomasina sees the world. What could have ended her creativity became the method behind it.</p>
          <p>She works closer to her glass than most artists ever would. She presses her face near the surface, studies the edge, the seam, the spark, and the color shift. The limitation became the method.</p>
          <p>The result is work that could not have come from anyone else’s hands.</p>
        </div>
        <div className="image-frame"><img src="/images/thomasina.jpg" alt="Thomasina Schnepf" /></div>
      </section>
    </>
  )
}

function CollectionsPreview() {
  const collectionCards = [
    ['Pendants', 'Named glass pendants released one at a time.', '/shop'],
    ['Sets', 'Coordinated necklace, earring, bracelet, and story sets.', '/shop'],
    ['Plates & Wall Art', 'Display pieces for homes, offices, churches, and gifts.', '/shop'],
    ['Community', 'Workshops, outreach, faith, and disability-awareness opportunities.', '/collaborate'],
  ]
  return (
    <section className="light-section">
      <p className="eyebrow">The Collections</p>
      <h2>The founding categories.</h2>
      <div className="collection-grid">
        {collectionCards.map(([title, text, href]) => (
          <Link className="collection-card" to={href} key={title}>
            <span>✦</span>
            <h3>{title}</h3>
            <p>{text}</p>
            <b>Explore →</b>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Collections() {
  return (
    <>
      <PageHero eyebrow="Collections" title="One artist. Many ways to carry the story." text="The catalog is being organized around clear adoption categories so each physical creation has one name, one SKU, one image, and one path to adoption." />
      <CollectionsPreview />
    </>
  )
}

function ProductGrid() {
  const [active, setActive] = useState('all')
  const filtered = active === 'all' ? mvpPilotProducts : mvpPilotProducts.filter(p => p.collection === active)
  return (
    <section className="shop-section">
      <div className="tab-row">
        {categories.map(c => <button key={c.key} className={active === c.key ? 'active' : ''} onClick={() => setActive(c.key)}>{c.label}</button>)}
      </div>
      <div className="product-grid">
        {filtered.map(product => <ProductCard product={product} key={product.sku} />)}
      </div>
    </section>
  )
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-image">
        {product.image ? <img src={product.image} alt={product.name} /> : <div className="image-placeholder">Image cleanup pending</div>}
        <span className="product-badge">One of One</span>
        <span className="sku-badge">{product.sku}</span>
      </div>
      <div className="product-body">
        <div className="name-price"><h3>{product.name}</h3><b>${product.price}</b></div>
        <p className="subtitle">{product.subtitle}</p>
        <p>{product.description}</p>
        <div className="product-meta"><span>Physical item confirmed</span><span>Shopify URL pending</span></div>
        <Link className="btn btn-outline wide" to="/schedule">Ask About This Piece</Link>
      </div>
    </article>
  )
}

function Shop() {
  return (
    <>
      <PageHero eyebrow="Adoption Catalog" title="Each one has a name." text="No two pieces are repeated. Every creation is named, numbered, and released once. When it’s gone, it’s gone." />
      <ProductGrid />
    </>
  )
}

function Collaborate() {
  const uses = ['Church Programs', 'Disability Awareness', 'Charity Events', 'School Visits', 'Community Art Days', 'Leadership Gifts', 'Fundraising Stores', 'Local Sponsorships']
  return (
    <>
      <PageHero eyebrow="Collaboration Model" title="Organizations, communities & causes." text="Sina’s Creations can collaborate with churches, schools, nonprofits, local businesses, and community groups that want art to represent more than decoration." />
      <section className="form-layout light-section">
        <div>
          <p className="eyebrow">How it works</p>
          <h2>Every collaboration starts with one question.</h2>
          <blockquote>“Who are we trying to lift?”</blockquote>
          <p>From there, Sina’s Creations can shape art, story, events, sponsorship, or adoption campaigns around the audience and mission.</p>
          <div className="mini-grid">{uses.map(u => <div key={u}>{u}<small>Tap to see sample →</small></div>)}</div>
        </div>
        <LeadForm title="Request a Collaboration Concept" />
      </section>
    </>
  )
}

function Wholesale() {
  return (
    <>
      <PageHero eyebrow="Wholesale" title="Carry Sina’s Creations in your store." text="For galleries, gift shops, boutiques, museums, churches, and local retailers interested in carrying one-of-one glass art or hosting adoption events." />
      <section className="form-only light-section"><LeadForm title="Wholesale / Retail Inquiry" long /></section>
    </>
  )
}

function Schedule() {
  return (
    <>
      <PageHero eyebrow="Let’s Talk" title="Schedule a Sina’s Creations conversation." text="Choose the type of conversation that fits your interest. We’ll confirm the next step and keep the project moving." />
      <section className="form-layout light-section">
        <div>
          <p className="eyebrow">Choose your conversation type</p>
          <h2>What would you like to discuss?</h2>
          {['Adoption / purchase question', 'Collaboration discovery', 'Wholesale inquiry', 'Sponsor conversation', 'Artist story / media', 'General project call'].map(item => <div className="choice" key={item}>{item}</div>)}
        </div>
        <LeadForm title="Book Your Conversation" />
      </section>
    </>
  )
}

function LeadForm({ title, long = false }) {
  return (
    <form className="lead-form">
      <h3>{title}</h3>
      <p>Submit your information and we’ll follow up with the right next step.</p>
      <div className="field-row"><input placeholder="First name" /><input placeholder="Last name" /></div>
      <div className="field-row"><input placeholder="Email" /><input placeholder="Phone" /></div>
      {long && <div className="field-row"><input placeholder="Business name" /><input placeholder="Website" /></div>}
      <select><option>Preferred conversation type</option><option>Adoption inquiry</option><option>Wholesale</option><option>Collaboration</option><option>Sponsorship</option></select>
      <textarea placeholder="Tell us what you have in mind..." />
      <button className="btn btn-copper wide" type="button">Submit ↑</button>
    </form>
  )
}

function CTA() {
  return <section className="cta"><h2>Be first to know when adoptions open.</h2><p>Join the founding community and get first access to the initial Sina’s Creations catalog.</p><Link className="btn btn-gold large" to="/schedule">Join the Founding Community</Link></section>
}

function PageHero({ eyebrow, title, text }) {
  return <section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></section>
}

function NotFound() {
  return <PageHero eyebrow="404" title="Page not found." text="Use the navigation to return to Sina’s Creations." />
}

function AppShell() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/story" element={<Story />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collaborate" element={<Collaborate />} />
        <Route path="/wholesale" element={<Wholesale />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  )
}

export default function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>
}
