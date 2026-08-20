import React, { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import LivingMosaic from '../components/LivingMosaic/LivingMosaic.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import WholesaleApplicationForm from '../components/WholesaleApplicationForm.jsx';
import SearchEyebrow from '../components/SearchEyebrow.jsx';
import { SiteSearchProvider } from '../components/SiteSearchContext.jsx';
import useCatalogProducts from '../hooks/useCatalogProducts.js';
import usePageMeta from '../hooks/usePageMeta.js';
import '../styles/hero-image-overrides.css';

const headerLogoPath = '/assets/brand/sinas-creations-black-logo.png';
const footerLogoPath = '/assets/brand/sinas-creations-white-logo.png';
const meetSinaSmile = '/images/meet-sina/meet-sina-smile-square.jpg';
const meetSinaCloseup = '/images/meet-sina/meet-sina-closeup.jpg';
const meetSinaStudio = '/images/meet-sina/meet-sina-studio.jpg';

const primaryNav = [
  { to: '/', label: 'Home' },
  { to: '/meet-sina', label: 'Meet Sina' },
  { to: '/commission', label: 'Commission Sina' },
  { to: '/shop', label: 'Adopt Sina\'s Creations' },
  { to: '/wholesale', label: 'Wholesale Partners' },
];

const footerNav = [
  { to: '/meet-sina', label: 'Meet Sina' },
  { to: '/commission', label: 'Commission Sina' },
  { to: '/wholesale', label: 'Wholesale Partners' },
  { to: '/shop', label: 'Adopt Sina\'s Creations' },
];

const footerConnect = [
  { to: '/commission', label: 'Commission' },
  { to: '/wholesale', label: 'Wholesale' },
  { to: '/schedule', label: 'Schedule' },
];

const heroHomeSlides = [1, 2, 3, 4, 5, 6].map((n) => `/images/hero/hero_home${n}.jpg`);

const pageHeroImages = {
  artist: '/images/hero/meet-sina-painted-portrait.jpg',
  creations: '/images/hero/home-mosaic-box-logo.jpg',
  commission: '/images/hero/commission-sina-group-pendants.jpg',
  wholesale: '/images/hero/wholesale-partners-piece-in-box.png',
  shop: '/images/products/103.JPG',
  schedule: '/images/products/100.JPG',
};

const inquiryOptions = ['Adoption', 'Commission', 'Wholesale', 'Meet Sina', 'Gift Question', 'General Question'];

const collectionIcons = {
  Pendants: 'pendants',
  Necklaces: 'necklaces',
  Lanyards: 'lanyards',
  Plates: 'plates',
  Plaques: 'wall-art',
  Charms: 'charms',
  Sets: 'sets',
};

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

function readShopSearchTerm(searchString = '') {
  return new URLSearchParams(searchString).get('q')?.trim() || '';
}

function Layout({ children }) {
  return (
    <SiteSearchProvider>
      <LayoutFrame>{children}</LayoutFrame>
    </SiteSearchProvider>
  );
}

function LayoutFrame({ children }) {
  const [open, setOpen] = useState(false);
  const [headerSearchValue, setHeaderSearchValue] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const isShopPage = location.pathname === '/shop';

  React.useEffect(() => {
    setHeaderSearchValue(readShopSearchTerm(location.search));
  }, [location.search]);

  const close = () => setOpen(false);
  const handleMenuToggle = () => {
    setOpen((current) => !current);
  };
  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault();
    close();
    const trimmed = headerSearchValue.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
  };
  const clearHeaderSearch = () => {
    setHeaderSearchValue('');

    if (location.pathname === '/shop') {
      const params = new URLSearchParams(location.search);
      params.delete('q');
      navigate(params.toString() ? `/shop?${params.toString()}` : '/shop');
    }
  };

  return (
    <div className={`site-shell${isShopPage ? ' site-shell--shop' : ''}`}>
      <header className="site-header">
        <Link className="brand logo-brand" to="/" onClick={close} aria-label="Sina's Creations home">
          <img className="brand-logo" src={headerLogoPath} alt="Sina's Creations" />
          <span className="brand-fallback" aria-hidden="true"><span>Sina</span><small>Creations</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {primaryNav.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
        </nav>
        <form className="header-catalog-search header-catalog-search--global" onSubmit={handleHeaderSearchSubmit} role="search">
          <span className="header-catalog-search__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </span>
          <input
            className="header-catalog-search__input"
            type="search"
            value={headerSearchValue}
            onChange={(event) => setHeaderSearchValue(event.target.value)}
            placeholder="Search by SKU or piece name"
          />
          {headerSearchValue && (
            <button type="button" className="header-catalog-search__clear" onClick={clearHeaderSearch} aria-label="Clear search">×</button>
          )}
        </form>
        <button className="menu-button" onClick={handleMenuToggle} aria-label={open ? 'Close menu' : 'Open menu'}>
          <span className={open ? 'x' : ''}></span>
          <span className={open ? 'x' : ''}></span>
          <span className={open ? 'x' : ''}></span>
        </button>
      </header>
      {open && (
        <div className="mobile-menu">
          {primaryNav.map((item) => <NavLink key={item.to} onClick={close} to={item.to}>{item.label}</NavLink>)}
        </div>
      )}
      {children}
      <Footer />
    </div>
  );
}

function useHeroSlideshow(slideCount, intervalMs) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slideCount < 2) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slideCount, intervalMs]);

  return index;
}

// Renders each string in `lines` as its own non-wrapping row, sized to the
// widest row's actual measured pixel width so it always fills -- but never
// overflows -- its container, on any device or font. Measures at
// maxFontSize once, then scales down proportionally if that overflows
// (font metrics scale linearly with font-size for a given string/font, so
// one measurement is enough -- no iterative fitting needed).
function FitHeading({ as: Tag = 'span', lines, maxFontSize, minFontSize = 16, className = '' }) {
  const containerRef = React.useRef(null);
  const rowRefs = React.useRef([]);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const fit = () => {
      const availableWidth = container.clientWidth;
      if (!availableWidth) return;

      container.style.setProperty('--fit-size', `${maxFontSize}px`);
      let widest = 0;
      rowRefs.current.forEach((el) => {
        if (el && el.scrollWidth > widest) widest = el.scrollWidth;
      });

      const size = widest > availableWidth
        ? Math.max(minFontSize, Math.floor(maxFontSize * (availableWidth / widest)))
        : maxFontSize;

      container.style.setProperty('--fit-size', `${size}px`);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [maxFontSize, minFontSize, lines]);

  return (
    <Tag ref={containerRef} className={`fit-heading${className ? ` ${className}` : ''}`}>
      {lines.map((line, index) => (
        <span key={index} ref={(el) => { rowRefs.current[index] = el; }} className="fit-heading__row">
          {line}
        </span>
      ))}
    </Tag>
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
  backgroundImages,
  backgroundPosition = 'center top',
  backgroundFlip = false,
  slideIntervalMs = 8000,
}) {
  const slides = backgroundImages && backgroundImages.length ? backgroundImages : null;
  const activeSlide = useHeroSlideshow(slides ? slides.length : 0, slideIntervalMs);
  const hasBackground = Boolean(backgroundImage) || Boolean(slides);

  return (
    <section className={`hero hero-dark${hasBackground ? ' hero--screened-image' : ''}`}>
      {slides ? (
        <>
          <div className="hero__background-stack" aria-hidden="true">
            {slides.map((src, i) => (
              <div
                key={src}
                className={`hero__background-slide${i === activeSlide ? ' is-active' : ''}`}
                style={{ backgroundImage: `url(${src})`, backgroundPosition }}
              />
            ))}
          </div>
          <div className="hero__scrim" aria-hidden="true" />
        </>
      ) : backgroundImage && (
        <>
          <div
            className="hero__background"
            aria-hidden="true"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundPosition,
              transform: backgroundFlip ? 'scaleX(-1) scale(1.02)' : undefined,
              transformOrigin: backgroundFlip ? 'center' : undefined,
            }}
          />
          <div className="hero__scrim" aria-hidden="true" />
        </>
      )}
      <div className="hero-inner">
        {eyebrow && <SearchEyebrow label={eyebrow} className="hero-search-eyebrow" />}
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

function SectionHeader({ eyebrow, title, copy, className = '' }) {
  return (
    <div className={`section-header${className ? ` ${className}` : ''}`}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function CategoryIcon({ type }) {
  switch (type) {
    case 'pendants':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5Zm0 5v2.5" />
          <path d="M12 11l4.5 5.5L12 21l-4.5-4.5L12 11Z" />
        </svg>
      );
    case 'necklaces':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4c0 3 2.2 5.5 5 7c2.8-1.5 5-4 5-7" />
          <path d="M9 15c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3Z" />
        </svg>
      );
    case 'lanyards':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4c0 3.2 1.7 5.8 4 7.5c2.3-1.7 4-4.3 4-7.5" />
          <path d="M10 14h4" />
          <path d="M11 14v5" />
          <path d="M13 14v5" />
        </svg>
      );
    case 'plates':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case 'wall-art':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4.5" y="5" width="15" height="14" rx="1.5" />
          <path d="M8 14l2.5-2.5 2.2 2.2 3.3-4.2 2 2.5" />
        </svg>
      );
    case 'charms':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 1.9 4 4.4.6-3.2 3.1.8 4.4L12 14l-3.9 2.1.8-4.4-3.2-3.1 4.4-.6L12 4Z" />
        </svg>
      );
    case 'sets':
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="6" width="7" height="7" rx="1.2" />
          <rect x="13" y="6" width="7" height="7" rx="1.2" />
          <rect x="8.5" y="13" width="7" height="7" rx="1.2" />
        </svg>
      );
  }
}

export function Home() {
  const { products } = useCatalogProducts();
  usePageMeta(
    "Sina's Creations — Handcrafted Fused Glass Jewelry & Art",
    'One-of-one fused-glass jewelry and art, handmade by Thomasina Schnepf. Every creation is named, photographed, and offered to one person.'
  );

  return (
    <Layout>
      <Hero
        eyebrow="Crafted. Named. Adopted."
        title={<FitHeading lines={['More Than Jewelry.', 'A Story You Can Hold.']} maxFontSize={78} minFontSize={18} />}
        copy="Every creation begins as glass, but it becomes something more personal once Thomasina names it. Each piece is made by hand, chosen with intention, and offered to one person who feels connected to its color, texture, and story."
        primary="A Message From The Artist"
        primaryTo="/meet-sina#message"
        backgroundImages={heroHomeSlides}
        backgroundPosition="left center"
      />
      <section className="cream-section living-mosaic-section" id="collection">
        <div className="section-header">
          <span>Her Story &amp; Creations. Your Choice.</span>
          <FitHeading
            as="h2"
            className="living-mosaic-section__title"
            lines={['The Closer She Gets,', 'The More She Sees.']}
            maxFontSize={44}
            minFontSize={16}
          />
        </div>
        <div className="living-mosaic__body">
          <div className="living-mosaic__visual">
            <LivingMosaic />
            <p className="living-mosaic__hint">
              Pinch and grab inside the portrait to explore the creations up close.
              <span className="living-mosaic__hint-desktop"> On a computer: scroll to zoom in and out, then click and drag to look around.</span>
            </p>
          </div>
          <div className="living-mosaic__story">
            <p className="living-mosaic__lead">Step back to see this amazing legally blind artist.</p>
            <p className="living-mosaic__story-copy">Every named creation carries a piece of Sina&rsquo;s vision &mdash; glass, light, color, texture, and touch shaped into something that will never exist again.</p>
            <p className="living-mosaic__lead">Come closer to meet her family of one-of-a-kind creations.</p>
            <div className="dark-card living-mosaic__card">
              <span>1 of 1</span>
              <h3>Each creation waits for the person it was meant to find.</h3>
              <p>When a piece is adopted, it leaves Thomasina&apos;s hands and begins its next story in a new home.</p>
            </div>
            <div className="hero-actions">
              <Link className="button primary" to="/shop">Adopt Sina&apos;s Creations</Link>
            </div>
          </div>
        </div>
      </section>
      <FeaturedProducts products={products} />
    </Layout>
  );
}

export function Story() {
  usePageMeta(
    "Meet Sina — The Artist Behind Every 1-of-1 Creation | Sina's Creations",
    "Meet Thomasina Schnepf, the artist behind Sina's Creations. Legally blind, she works by touch, light, and color to hand-make every fused-glass piece."
  );
  return (
    <Layout>
      <Hero
        eyebrow="Meet Sina"
        title={<FitHeading lines={['The Artist Behind', 'Every 1-of-1 Creation.']} maxFontSize={78} minFontSize={18} />}
        copy="Thomasina Schnepf creates by touch, light, color, and close attention. Her work is personal, tactile, and made to be worn, displayed, gifted, and remembered one original at a time."
        primary="Adopt Sina's Creations"
        primaryTo="/shop"
        backgroundImage={pageHeroImages.artist}
      />
      <section className="cream-section meet-sina-page" id="message">
        <div className="meet-sina-message">
          <div className="meet-sina-mobile-intro">
            <SectionHeader eyebrow="A Message From the Designer" title={<>My&nbsp;name&nbsp;is<br />Thomasina&nbsp;Schnepf.</>} className="meet-sina-headline" />
            <div className="meet-sina-mobile-inset-row">
              <article className="meet-sina-photo-card meet-sina-photo-card--mobile-headline">
                <img src={meetSinaSmile} alt="Thomasina Schnepf smiling while working with fused glass pieces." />
              </article>
              <p className="meet-sina-pullquote">I am legally blind, and because of this, I create and &ldquo;view&rdquo; the world &mdash; and my work &mdash; very closely.</p>
            </div>
          </div>
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
          </div>
        </div>
      </section>
    </Layout>
  );
}

export function Collections() {
  const { collections } = useCatalogProducts();

  return (
    <Layout>
      <Hero
        eyebrow="1-of-1 Creations"
        title="One body of work. Many ways to adopt."
        copy="Pendants, wire-wrapped pieces, necklaces, plaques, plates, wall art, lanyards, and sets &mdash; each one made by hand and released as its own original creation."
        primary="Shop Available Pieces"
        primaryTo="/shop"
        backgroundImage={pageHeroImages.creations}
      />
      <section className="cream-section collection-grid">
        {collections.map((name) => (
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
  usePageMeta(
    "Commission Sina — Custom Fused Glass Art | Sina's Creations",
    'Commission a custom fused-glass piece from Thomasina Schnepf, shaped around a person, memory, color story, or meaning.'
  );
  return (
    <Layout>
      <Hero
        eyebrow="Commission Sina"
        title={<FitHeading lines={['Collaborate With', 'Sina’s Customs.']} maxFontSize={78} minFontSize={18} />}
        copy="If you want a piece shaped around a person, memory, color story, or meaning, start the conversation here and we will guide the next step together."
        primary="Start a Commission"
        primaryTo="/schedule"
        backgroundImage={pageHeroImages.commission}
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
  usePageMeta(
    "Wholesale Partners — Sell Sina's Creations | Sina's Creations",
    'Wholesale applications for boutiques, galleries, and retailers who want one-of-one fused-glass jewelry and art with a personal story behind every piece.'
  );
  return (
    <Layout>
      <Hero
        eyebrow="Wholesale Partners"
        title={<FitHeading lines={['Wholesale Partners:', 'Sell Sina’s Creations.']} maxFontSize={78} minFontSize={18} />}
        copy="Sina's Creations is accepting wholesale applications from boutiques, galleries, gift shops, and community retailers who want one-of-one jewelry and glass art with a personal story behind every piece."
        primary="Start the Application"
        primaryTo="/wholesale#application"
        backgroundImage={pageHeroImages.wholesale}
      />
      <WholesaleApplicationForm />
    </Layout>
  );
}

// A short path for shared product links (/p/SKU) that just forwards into
// the real shop deep link (/shop?sku=SKU) -- keeps what actually goes out
// in a text or social caption short, without needing a separate redirect
// service.
export function ProductShortLink() {
  const { sku } = useParams();
  return <Navigate to={`/shop?sku=${encodeURIComponent(sku || '')}`} replace />;
}

export function Shop() {
  const { products, collections } = useCatalogProducts();
  const location = useLocation();
  const navigate = useNavigate();
  const productGridRef = React.useRef(null);
  const shopCollections = React.useMemo(
    () => collections.filter((name) => collectionIcons[name]),
    [collections]
  );
  const sharedSku = React.useMemo(
    () => new URLSearchParams(location.search).get('sku')?.trim().toUpperCase() || '',
    [location.search]
  );
  const sharedProduct = React.useMemo(
    () => (sharedSku ? products.find((product) => product.sku === sharedSku) : null),
    [products, sharedSku]
  );
  // The middleware handles the initial server-rendered response for a
  // shared product link; this keeps the tab title in sync too once React
  // Router takes over (a client-side nav between products never re-hits
  // the middleware, only the first full page load does).
  usePageMeta(
    sharedProduct
      ? `${sharedProduct.name} — ${sharedProduct.category} | Sina's Creations`
      : "Shop All Creations | Sina's Creations",
    sharedProduct
      ? sharedProduct.description
      : 'Browse every available one-of-one fused-glass creation by Thomasina Schnepf -- pendants, necklaces, plaques, plates, and more.'
  );
  const queryFilter = React.useMemo(() => {
    const requested = new URLSearchParams(location.search).get('collection');
    if (shopCollections.includes(requested)) {
      return requested;
    }
    // A shared-product link (?sku=) should land on that product's own
    // category tab so the card is actually visible, not whatever tab
    // happens to be first.
    if (sharedProduct && shopCollections.includes(sharedProduct.category)) {
      return sharedProduct.category;
    }
    return shopCollections[0] || '';
  }, [location.search, shopCollections, sharedProduct]);
  const searchTerm = React.useMemo(() => readShopSearchTerm(location.search).toLowerCase(), [location.search]);
  // /api/adopt sends someone back here with ?sold=1 when the piece they
  // just tried to adopt sold out between page load and checkout click --
  // real inventory only lives in Shopify, so this is the one place that
  // race can actually surface.
  const justMissed = React.useMemo(() => new URLSearchParams(location.search).get('sold') === '1', [location.search]);

  const scrollProductsToTop = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const siteHeader = document.querySelector('.site-header');
    const stickyControls = document.querySelector('.shop-hero-controls');
    const siteHeaderHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
    const stickyControlsHeight = stickyControls ? stickyControls.getBoundingClientRect().height : 0;
    const target = productGridRef.current;

    if (!target) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const top = window.scrollY + target.getBoundingClientRect().top - siteHeaderHeight - stickyControlsHeight - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);

  const visible = React.useMemo(() => {
    if (searchTerm) {
      return products.filter((product) => {
        const sku = String(product.sku ?? '').toLowerCase();
        const name = String(product.name ?? '').toLowerCase();
        return sku.includes(searchTerm) || name.includes(searchTerm);
      });
    }

    return queryFilter ? products.filter((product) => product.category === queryFilter) : products;
  }, [products, queryFilter, searchTerm]);

  return (
    <Layout>
      <section className="shop-hero-controls" aria-label="Shop filters">
        <div className="shop-hero-controls__inner">
          <div className="shop-icon-tabs" role="tablist" aria-label="Filter products by collection">
            {shopCollections.map((tab) => {
              const iconType = collectionIcons[tab] || 'sets';
              const isActive = queryFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab}
                  className={`shop-icon-tab${isActive ? ' active' : ''}`}
                  onClick={() => {
                    navigate(`/shop?collection=${encodeURIComponent(tab)}`);
                    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollProductsToTop));
                  }}
                >
                  <span className="shop-icon-tab__glyph"><CategoryIcon type={iconType} /></span>
                  <span className="shop-icon-tab__label">{tab}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <section className="shop-section shop-section--floating-controls">
        {justMissed && (
          <div className="shop-sold-notice">
            <p>That one was just adopted by someone else &mdash; sorry! Here&rsquo;s the rest of the collection.</p>
          </div>
        )}
        <div className="product-grid" ref={productGridRef}>
          {visible.map((product) => <ProductCard product={product} sharedSku={sharedSku} key={product.sku} />)}
        </div>
        {!visible.length && (
          <div className="shop-empty-state">
            <h3>No matching pieces yet.</h3>
            <p>Try a different SKU or product name to keep searching the full catalog.</p>
          </div>
        )}
      </section>
    </Layout>
  );
}

// Matches api/catalog.js's CATEGORY_MAP output -- every category a product
// can actually end up with -- to a singular "Featured X" eyebrow label.
const FEATURED_EYEBROW_BY_CATEGORY = {
  Pendants: 'Featured Pendant',
  'Wire Wrapped': 'Featured Pendant',
  Necklaces: 'Featured Necklace',
  'Ocean Necklaces': 'Featured Necklace',
  Plates: 'Featured Plate',
  Plaques: 'Featured Plaque',
  Charms: 'Featured Charm',
  Sets: 'Featured Set',
  Lanyards: 'Featured Lanyard',
};

// Featured Pieces is driven by a "Featured" checkbox column in the Google
// Sheet (same TRUE/FALSE pattern as "Published") instead of a hardcoded SKU
// list, so adopting-out a featured piece and unchecking Published there
// drops it here automatically -- no code change/deploy needed to keep this
// section current. Capped so an enthusiastic amount of checked boxes can't
// turn "weekly featured pieces" into the whole catalog.
const MAX_FEATURED = 8;

function FeaturedProducts({ products }) {
  const featured = React.useMemo(() => {
    return products
      .filter((product) => product.featured)
      .slice(0, MAX_FEATURED)
      .map((product) => ({
        product,
        eyebrow: FEATURED_EYEBROW_BY_CATEGORY[product.category] || 'Featured Piece',
      }));
  }, [products]);

  if (!featured.length) return null;

  return (
    <section className="cream-section">
      <SectionHeader
        eyebrow="Available Now"
        title={<FitHeading lines={['Weekly Featured Pieces:', 'Ready For Adoption']} maxFontSize={44} minFontSize={16} />}
        copy="Begin with a few of the creations currently available from Thomasina's first release."
      />
      <div className="product-grid compact">
        {featured.map(({ product, eyebrow }) => (
          <ProductCard product={product} eyebrowOverride={eyebrow} key={product.sku} />
        ))}
      </div>
      <div className="hero-actions">
        <Link className="button primary" to="/shop">Browse Sina&rsquo;s Full Collection</Link>
      </div>
    </section>
  );
}

export function Schedule() {
  usePageMeta(
    "Contact Sina's Creations — Ask, Commission, or Adopt a Piece",
    "Ask about an available piece, request a commission, explore wholesale, or reach out to Sina's Creations directly."
  );
  return (
    <Layout>
      <Hero
        eyebrow="Let's Talk"
        title="Schedule a Sina's Creations conversation."
        copy="Ask about an available piece, request a commission, explore wholesale, or reach out after reading Sina's message."
        primary="View Available Pieces"
        primaryTo="/shop"
        backgroundImage={pageHeroImages.schedule}
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

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46H16.6V4.14C16.3 4.1 15.3 4 14.2 4c-2.35 0-3.95 1.43-3.95 4.06v2.24H7.6v3h2.65V21h3.25Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M13.6 10.5 20 3h-2l-5.2 6-4.2-6H3l6.7 9.5L3 21h2l5.6-6.5L15 21h5.5l-6.9-10.5Zm-2 2.3-.65-.9L5.4 4.6h2l4.2 5.9.65.9 5.9 8.3h-2l-4.5-6.3Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.6 3h-3v11.6a2.6 2.6 0 1 1-1.9-2.5V8.9a5.9 5.9 0 1 0 4.9 5.8V9.4a7.5 7.5 0 0 0 4.4 1.4V7.7A4.6 4.6 0 0 1 16.6 3Z" />
    </svg>
  );
}

const footerSocialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/sinascreations?igsh=bThtdGtrbzNmOG9m&igsi=bThtdGtrbzNmOG9m', Icon: InstagramIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/share/1CvzKETZEP/', Icon: FacebookIcon },
  { label: 'X', href: 'https://x.com/SinasGlasss', Icon: XIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/@sinascreations?_r=1&_t=ZT-98xLwfn3d2T', Icon: TikTokIcon },
];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <img className="footer-logo" src={footerLogoPath} alt="Sina's Creations" />
          <p>1 of 1 fused glass art. Named, made by hand, and adopted once.</p>
        </div>
        <div>
          <h4>Navigate</h4>
          {footerNav.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </div>
        <div>
          <h4>Connect</h4>
          {footerConnect.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          <a href="tel:+14804476002">(480) 447-6002</a>
          <a href="mailto:sinasartisticcreations@gmail.com">sinasartisticcreations@gmail.com</a>
          <div className="footer-social">
            {footerSocialLinks.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="footer-social__link">
                <Icon />
              </a>
            ))}
          </div>
        </div>
        <div><h4>Adopt</h4><p>Choose a piece, ask a question, or start a custom conversation.</p><Link className="button primary footer-button" to="/shop">Adopt</Link></div>
      </div>
      <div className="footer-bottom">
        <p className="footer-disclaimer">Disclaimer: Each piece is handmade from fused glass and one-of-one; natural variation in color, texture, and shape is part of the process, not a defect. Product images are for reference only. Pricing and availability may change.</p>
        <div className="footer-legal">
          <div className="footer-legal__links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Messaging Terms</Link>
          </div>
          <p className="footer-copyright">&copy; 2026 Sina&apos;s Creations &middot; sinascreations.com &middot; Queen Creek, AZ</p>
          <p className="footer-powered">Powered by <a href="https://armsreachdigital.agency" target="_blank" rel="noopener noreferrer">ARMS REACH Digital Agency</a></p>
        </div>
      </div>
    </footer>
  );
}

const legalLastUpdated = 'August 17, 2026';

function LegalPage({ eyebrow, title, children }) {
  return (
    <Layout>
      <section className="cream-section legal-page">
        <div className="legal-page__header">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p className="legal-page__updated">Last updated {legalLastUpdated}.</p>
        </div>
        <div className="legal-page__body">{children}</div>
      </section>
    </Layout>
  );
}

export function Privacy() {
  usePageMeta("Privacy Policy | Sina's Creations", "Sina's Creations' privacy policy.");
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy">
      <h2>Information we collect</h2>
      <p>When you use this website, ask about adopting a piece, request a commission or wholesale application, or otherwise contact Sina&apos;s Creations, we may collect information you provide such as your name, email address, phone number, mailing address, and the content of your message or inquiry. We may also collect basic website analytics and technical information such as device, browser, referring page, and pages viewed.</p>
      <h2>How we use information</h2>
      <p>We use information to respond to inquiries, process adoption and commission requests, fulfill and ship orders, follow up about a request, improve the website and shopping experience, maintain business records, and protect the security and operation of our services.</p>
      <h2>Text messages and email</h2>
      <p>If you expressly agree to receive follow-up messages, Sina&apos;s Creations may contact you by text message or email about your inquiry, order, commission, or related services. Consent to receive marketing messages is not a condition of purchase. Message and data rates may apply. Message frequency varies. You may reply STOP to opt out of text messages and HELP for help.</p>
      <h2>Service providers</h2>
      <p>We may use service providers that help operate the website, forms, scheduling, payment processing, communications, analytics, and hosting. These providers may process information on our behalf as necessary to provide those services. We do not sell your personal information.</p>
      <h2>Payment information</h2>
      <p>Payments for adopted pieces are processed by a third-party payment processor. Sina&apos;s Creations does not store your full payment card details.</p>
      <h2>Your choices</h2>
      <p>You may ask to review, correct, or delete personal information that Sina&apos;s Creations maintains about you, subject to legal or operational retention requirements. You may also opt out of non-essential follow-up communications at any time.</p>
      <h2>Contact</h2>
      <p>For privacy questions or requests, contact Sina&apos;s Creations at <a href="mailto:sinasartisticcreations@gmail.com">sinasartisticcreations@gmail.com</a> or <a href="tel:+14804476002">(480) 447-6002</a>.</p>
    </LegalPage>
  );
}

export function Terms() {
  usePageMeta("Terms & Messaging Terms | Sina's Creations", "Sina's Creations' terms and messaging terms.");
  return (
    <LegalPage eyebrow="Terms" title="Terms &amp; Messaging Terms">
      <h2>Website information</h2>
      <p>Sina&apos;s Creations provides this website for general information, browsing available pieces, requesting commissions and wholesale applications, and client communication. Website content is provided for informational purposes and is not a guarantee of availability, appearance, or delivery timing for any specific piece.</p>
      <h2>Products and adoption</h2>
      <p>Every piece is handmade, one-of-one fused glass art. Natural variation in color, texture, and shape is part of the handmade process, not a defect. Availability, pricing, and package terms may change. Sina&apos;s Creations may decline or postpone an adoption when appropriate.</p>
      <h2>Scheduling and purchases</h2>
      <p>Appointment availability, pricing, and service details may change. Any purchase-specific terms presented at checkout also apply. Contact Sina&apos;s Creations before purchase if you have questions about a piece, commission, or scheduling.</p>
      <h2>Text messaging terms</h2>
      <p>When you provide your mobile number and expressly consent to follow-up messages, you authorize Sina&apos;s Creations to send text messages related to your inquiry, commission, appointments, order updates, and, when permitted by your consent, promotional follow-up. Message frequency varies. Message and data rates may apply. Consent is not a condition of purchase.</p>
      <p>Reply STOP to opt out of text messages. Reply HELP for help. Carriers are not liable for delayed or undelivered messages. You are responsible for providing a mobile number you are authorized to use.</p>
      <h2>Acceptable use</h2>
      <p>You agree not to misuse the website, attempt unauthorized access, interfere with website operation, submit unlawful or misleading information, or use the website in a manner that harms Sina&apos;s Creations or other users.</p>
      <h2>Privacy</h2>
      <p>Use of personal information is described in the <Link to="/privacy">Privacy Policy</Link>.</p>
      <h2>Contact</h2>
      <p>Questions about these terms may be sent to <a href="mailto:sinasartisticcreations@gmail.com">sinasartisticcreations@gmail.com</a> or <a href="tel:+14804476002">(480) 447-6002</a>.</p>
    </LegalPage>
  );
}

export function NotFound() {
  return (
    <Layout>
      <Hero eyebrow="Not Found" title="This page is still being created." copy="Use the navigation to return to the active Sina's Creations pages." primary="Go Home" primaryTo="/" />
    </Layout>
  );
}
