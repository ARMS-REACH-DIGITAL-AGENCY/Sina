import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import LivingMosaic from '../components/LivingMosaic/LivingMosaic.jsx';
import WholesaleApplicationForm from '../components/WholesaleApplicationForm.jsx';
import SearchEyebrow from '../components/SearchEyebrow.jsx';
import { SiteSearchProvider } from '../components/SiteSearchContext.jsx';
import useCatalogProducts from '../hooks/useCatalogProducts.js';
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
  'Wall Art': 'wall-art',
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

export function Shop() {
  const { products, collections } = useCatalogProducts();
  const location = useLocation();
  const navigate = useNavigate();
  const productGridRef = React.useRef(null);
  const shopCollections = React.useMemo(
    () => collections.filter((name) => collectionIcons[name]),
    [collections]
  );
  const queryFilter = React.useMemo(() => {
    const requested = new URLSearchParams(location.search).get('collection');
    if (shopCollections.includes(requested)) {
      return requested;
    }
    return shopCollections[0] || '';
  }, [location.search, shopCollections]);
  const searchTerm = React.useMemo(() => readShopSearchTerm(location.search).toLowerCase(), [location.search]);

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
        <div className="product-grid" ref={productGridRef}>
          {visible.map((product) => <ProductCard product={product} key={product.sku} />)}
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

function cleanProductHtml(value = '') {
  return String(value)
    .replace(/\[\[SIZE_TBD\]\]/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
}

// descriptionHtml's first paragraph is almost always `<p><strong>{headline}</strong></p>`
// -- the exact same text already shown as product.line directly above it on the
// card. Strip that lead paragraph so expanding a card doesn't show the short
// description twice.
function stripLeadingHeadline(html, headline) {
  if (!headline) return html;
  const escaped = headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*<p>\\s*<strong>\\s*${escaped}\\s*<\\/strong>\\s*<\\/p>`, 'i');
  return html.replace(pattern, '');
}

function ProductCardDescription({ product }) {
  if (product.descriptionHtml) {
    const html = stripLeadingHeadline(cleanProductHtml(product.descriptionHtml), product.line);
    return <div className="product-card__description" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // The short description (product.line) is already shown above this. Only
  // fall back to it here -- and only render at all -- when there's a real,
  // distinct long description; otherwise this would just repeat the same
  // line the card already showed.
  if (!product.description || product.description === product.line) {
    return null;
  }

  return <p className="product-card__description">{product.description}</p>;
}

function ProductCard({ product, eyebrowOverride }) {
  const [showBack, setShowBack] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(product.image);
  // Sheet data entry mistakes happen -- a row's "Final Image Filename" can
  // name a file that was never actually uploaded under that name, while the
  // real photo sits under the legacy shoot-number filename every other
  // product uses (e.g. NKL-166.JPG requested, 166.JPG is what's really
  // there). api/catalog.js hands back every plausible filename for a photo;
  // track which ones have already failed so a load error advances to the
  // next candidate instead of just leaving a broken image.
  const [failedSrcs, setFailedSrcs] = React.useState(() => new Set());
  // Only the product's own real photo(s). Previously this padded out to 4
  // "thumbnails" using unrelated Thomasina studio photos as a placeholder --
  // the catalog only has one photo per piece today, so the thumbnail row
  // just doesn't render until there's more than one real image to show.
  const galleryImages = React.useMemo(() => [product.image].filter(Boolean), [product.image]);

  React.useEffect(() => {
    setActiveImage(product.image);
    setFailedSrcs(new Set());
  }, [product.image]);

  const imageFallbackChain = React.useMemo(
    () => [activeImage, ...(product.imageFallbacks || [])].filter(Boolean),
    [activeImage, product.imageFallbacks]
  );
  const displayImage = imageFallbackChain.find((src) => !failedSrcs.has(src)) || imageFallbackChain[imageFallbackChain.length - 1];

  const handleImageError = () => {
    setFailedSrcs((prev) => (prev.has(displayImage) ? prev : new Set(prev).add(displayImage)));
  };

  const toggleCard = () => setShowBack((current) => !current);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard();
    }
  };

  const handleThumbClick = (event, image) => {
    event.stopPropagation();
    setActiveImage(image);
    setFailedSrcs(new Set());
  };

  const hasDimensions = Boolean(product.height || product.width || product.weight);
  const eyebrowLabel = eyebrowOverride || product.category;

  return (
    <article
      className={`product-card${showBack ? ' is-back' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={showBack}
      aria-label={`${product.name} product card. ${showBack ? 'Showing full details.' : 'Showing front of card.'} Activate to flip.`}
      onClick={toggleCard}
      onKeyDown={handleKeyDown}
    >
      <div className="product-card__visual">
        <div className="product-card__image">
          <img
            src={displayImage}
            alt={`${product.name}, ${product.category} by Sina's Creations`}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
          <span className="product-card__one-of-one"><span className="nowrap">1-of-1</span></span>
        </div>
        {galleryImages.length > 1 && (
          <div className="product-card__thumbs" aria-label={`${product.name} image gallery`}>
            {galleryImages.map((image, index) => (
              <button
                key={`${product.sku}-${index}`}
                type="button"
                className={`product-card__thumb${activeImage === image ? ' active' : ''}`}
                onClick={(event) => handleThumbClick(event, image)}
                aria-label={`View image ${index + 1} for ${product.name}`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-card__panel">
        {!showBack ? (
          <>
            <div className="sku-row"><span>{eyebrowLabel}</span><strong>SKU {product.sku}</strong></div>
            <h3>{product.name}</h3>
            <p>{product.line}</p>
            <div className="price-row"><span><span className="nowrap">1-of-1</span> Cost of Adoption</span><strong>${product.price}</strong></div>
            <div className="product-card__flip-cta-row">
              <span className="product-card__flip-cta">Read {product.name}&rsquo;s Story Before Adopting</span>
            </div>
          </>
        ) : (
          <>
            <div className="sku-row"><span>{eyebrowLabel}</span><strong>SKU {product.sku}</strong></div>
            <h3>{product.name}</h3>
            <p>{product.line}</p>
            <div className="product-card__description-shell">
              <ProductCardDescription product={product} />
            </div>
            {hasDimensions && (
              <div className="product-card__dimensions">
                {product.height && <span>H {product.height}&Prime;</span>}
                {product.width && <span>W {product.width}&Prime;</span>}
                {product.weight && <span>{product.weight} oz</span>}
              </div>
            )}
            <div className="price-row"><span><span className="nowrap">1-of-1</span> Cost of Adoption</span><strong>${product.price}</strong></div>
            <button type="button" className="button primary product-card__adopt-cta">Adopt Me</button>
            <p className="product-card__close-hint">Close</p>
          </>
        )}
      </div>
    </article>
  );
}

const FEATURED_SKUS = [
  { sku: 'PND-SM-200', eyebrow: 'Featured Pendant' },
  { sku: 'NKL-140', eyebrow: 'Featured Necklace' },
  { sku: 'LNY-20', eyebrow: 'Featured Lanyard' },
  { sku: 'PLT-FG-33', eyebrow: 'Featured Plate' },
  { sku: 'PLQ-FG-SM-56', eyebrow: 'Featured Wall Art' },
  { sku: 'CHM-202', eyebrow: 'Featured Charm' },
  { sku: 'SET-NKLO-EAR-116', eyebrow: 'Featured Set' },
];

function FeaturedProducts({ products }) {
  const featured = React.useMemo(() => {
    const bySku = new Map(products.map((product) => [product.sku, product]));
    return FEATURED_SKUS
      .map(({ sku, eyebrow }) => (bySku.has(sku) ? { product: bySku.get(sku), eyebrow } : null))
      .filter(Boolean);
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
