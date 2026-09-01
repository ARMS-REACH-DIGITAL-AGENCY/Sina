// Product-page SEO for the Vite/React storefront.
//
// /p/:sku is a permanent, server-rendered product page. It is intentionally
// independent of the client-side shop so QR codes, search results, shares,
// and bookmarks always keep the same durable URL. The interactive catalog
// remains at /shop; product pages hand off to Shopify only after Adopt Me.

const SITE_ORIGIN = 'https://www.sinascreations.com';

export const config = {
  matcher: ['/p/:sku*', '/shop'],
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function categoryLabel(category) {
  const labels = {
    Pendants: 'Pendant',
    Necklaces: 'Necklace',
    'Ocean Necklaces': 'Necklace',
    Lanyards: 'Lanyard',
    Plates: 'Plate',
    Plaques: 'Plaque',
    Charms: 'Charm',
    Sets: 'Jewelry Set',
    Ornaments: 'Ornament',
    'Wire Wrapped': 'Pendant',
  };
  return labels[category] || String(category || 'Creation').replace(/s$/i, '');
}

function canonicalProductUrl(product) {
  return `${SITE_ORIGIN}/p/${encodeURIComponent(product.sku)}`;
}

function safeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

async function findProductBySku(request, sku) {
  if (!sku) return null;
  try {
    const catalogUrl = new URL('/api/catalog', request.url);
    const response = await fetch(catalogUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    const target = sku.trim().toUpperCase();
    return (data.products || []).find((product) => product.sku === target) || null;
  } catch (error) {
    return null;
  }
}

function productGalleryHtml(product, primaryImageUrl, label) {
  const urls = [];
  const add = (url) => {
    if (!url) return;
    const absolute = url.startsWith('http') ? url : `${SITE_ORIGIN}${url}`;
    if (!urls.includes(absolute)) urls.push(absolute);
  };

  add(primaryImageUrl);
  for (const slot of product.gallery || []) {
    if (Array.isArray(slot)) add(slot[0]);
  }

  return urls.slice(0, 4).map((url, index) => `
    <img
      src="${escapeHtml(url)}"
      alt="${escapeHtml(index === 0
        ? `${product.name}, one-of-one fused glass ${label.toLowerCase()} handcrafted by Thomasina Schnepf`
        : `${product.name}, additional view ${index + 1}`)}"
      ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
    />`).join('');
}

function globalHeaderHtml() {
  return `<header class="site-header">
    <a class="brand logo-brand" href="/" aria-label="Sina's Creations home">
      <img class="brand-logo" src="/assets/brand/sinas-creations-black-logo.png" alt="Sina's Creations" />
      <span class="brand-fallback" aria-hidden="true"><span>Sina</span><small>Creations</small></span>
    </a>
    <nav class="desktop-nav" aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/meet-sina">Meet Sina</a>
      <a href="/commission">Commission Sina</a>
      <a href="/shop">Adopt Sina's Creations</a>
      <a href="/wholesale">Wholesale Partners</a>
    </nav>
    <form class="header-catalog-search header-catalog-search--global" action="/shop" method="get" role="search">
      <span class="header-catalog-search__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5"></circle>
          <path d="M16 16l4.5 4.5"></path>
        </svg>
      </span>
      <input class="header-catalog-search__input" type="search" name="q" placeholder="Search by SKU or piece name" autocomplete="off" />
      <button type="button" class="header-catalog-search__clear" aria-label="Clear search" hidden>×</button>
    </form>
    <button type="button" class="menu-button" id="product-menu-button" aria-controls="product-mobile-menu" aria-expanded="false" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </header>
  <div class="mobile-menu" id="product-mobile-menu" hidden>
    <a href="/">Home</a>
    <a href="/meet-sina">Meet Sina</a>
    <a href="/commission">Commission Sina</a>
    <a href="/shop">Adopt Sina's Creations</a>
    <a href="/wholesale">Wholesale Partners</a>
  </div>`;
}

function globalFooterHtml() {
  return `<footer class="footer">
    <div class="footer-top">
      <div class="footer-brand">
        <img class="footer-logo" src="/assets/brand/sinas-creations-white-logo.png" alt="Sina's Creations" />
        <p>1 of 1 fused glass art. Named, made by hand, and adopted once.</p>
      </div>
      <div>
        <h4>Navigate</h4>
        <a href="/meet-sina">Meet Sina</a>
        <a href="/commission">Commission Sina</a>
        <a href="/wholesale">Wholesale Partners</a>
        <a href="/shop">Adopt Sina's Creations</a>
      </div>
      <div>
        <h4>Connect</h4>
        <a href="/commission">Commission</a>
        <a href="/wholesale">Wholesale</a>
        <a href="/schedule">Schedule</a>
        <a href="tel:+14804476002">(480) 447-6002</a>
        <a href="mailto:sinasartisticcreations@gmail.com">sinasartisticcreations@gmail.com</a>
        <div class="footer-social">
          <a href="https://www.instagram.com/sinascreations?igsh=bThtdGtrbzNmOG9m&igsi=bThtdGtrbzNmOG9m" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="footer-social__link">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.8"></rect><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"></circle><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"></circle></svg>
          </a>
          <a href="https://www.facebook.com/share/1CvzKETZEP/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="footer-social__link">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46H16.6V4.14C16.3 4.1 15.3 4 14.2 4c-2.35 0-3.95 1.43-3.95 4.06v2.24H7.6v3h2.65V21h3.25Z"></path></svg>
          </a>
          <a href="https://x.com/SinasCreations" target="_blank" rel="noopener noreferrer" aria-label="X" class="footer-social__link">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.6 10.5 20 3h-2l-5.2 6-4.2-6H3l6.7 9.5L3 21h2l5.6-6.5L15 21h5.5l-6.9-10.5Zm-2 2.3-.65-.9L5.4 4.6h2l4.2 5.9.65.9 5.9 8.3h-2l-4.5-6.3Z"></path></svg>
          </a>
          <a href="https://www.tiktok.com/@sinascreations?_r=1&_t=ZT-98xLwfn3d2T" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="footer-social__link">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3h-3v11.6a2.6 2.6 0 1 1-1.9-2.5V8.9a5.9 5.9 0 1 0 4.9 5.8V9.4a7.5 7.5 0 0 0 4.4 1.4V7.7A4.6 4.6 0 0 1 16.6 3Z"></path></svg>
          </a>
        </div>
      </div>
      <div>
        <h4>Adopt</h4>
        <p>Choose a piece, ask a question, or start a custom conversation.</p>
        <a class="button primary footer-button" href="/shop">Adopt</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-disclaimer">Disclaimer: Each piece is handmade from fused glass and one-of-one; natural variation in color, texture, and shape is part of the process, not a defect. Product images are for reference only. Pricing and availability may change.</p>
      <div class="footer-legal">
        <div class="footer-legal__links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Messaging Terms</a>
        </div>
        <p class="footer-copyright">&copy; 2026 Sina's Creations &middot; sinascreations.com &middot; Queen Creek, AZ</p>
        <p class="footer-powered">Powered by <a href="https://armsreachdigital.agency" target="_blank" rel="noopener noreferrer">ARMS REACH Digital Agency</a></p>
      </div>
    </div>
  </footer>`;
}

function productFallbackHtml(product, imageUrl, pageUrl) {
  const label = categoryLabel(product.category);
  const isSold = product.status === 'sold-out';
  const statusCopy = isSold
    ? `${product.name} has found a home, but this one-of-one creation remains here as part of Thomasina's body of work.`
    : `${product.name} is a one-of-one original currently available for adoption.`;
  const price = Number.isFinite(Number(product.price)) ? `$${Number(product.price).toFixed(2)}` : '';
  const colors = product.colorNames ? `<li><strong>Colors:</strong> ${escapeHtml(product.colorNames)}</li>` : '';
  const dimensions = [
    product.height ? `H ${escapeHtml(product.height)}&Prime;` : '',
    product.width ? `W ${escapeHtml(product.width)}&Prime;` : '',
    product.weight ? `${escapeHtml(product.weight)} oz` : '',
  ].filter(Boolean).join(' · ');
  const gallery = productGalleryHtml(product, imageUrl, label);

  return `<div id="root">
    <div class="site-shell">
      ${globalHeaderHtml()}
      <main class="seo-product-page">
        <nav class="seo-breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a><span>›</span><a href="/shop">Shop</a><span>›</span><span>${escapeHtml(product.name)}</span>
        </nav>
        <article class="seo-product-layout">
          <section class="seo-product-gallery" aria-label="Photos of ${escapeHtml(product.name)}">
            ${gallery}
          </section>
          <section class="seo-product-copy">
            <p class="seo-eyebrow">One-of-One Handcrafted Fused Glass ${escapeHtml(label)}</p>
            <h1>${escapeHtml(product.name)}</h1>
            <p class="seo-sku">SKU ${escapeHtml(product.sku)}</p>
            ${product.line ? `<p class="seo-product-line">${escapeHtml(product.line)}</p>` : ''}
            <div class="seo-product-story"><p>${escapeHtml(product.description || statusCopy)}</p></div>
            <ul class="seo-product-details">
              <li><strong>Artist:</strong> Thomasina Schnepf</li>
              <li><strong>Type:</strong> ${escapeHtml(label)}</li>
              ${colors}
              ${dimensions ? `<li><strong>Size:</strong> ${dimensions}</li>` : ''}
              ${price ? `<li><strong>Adoption price:</strong> ${escapeHtml(price)}</li>` : ''}
            </ul>
            <p class="seo-product-status">${escapeHtml(statusCopy)}</p>
            <div class="seo-product-actions">
              ${isSold
                ? '<a class="seo-primary-button" href="/shop">Browse Available Creations</a>'
                : `<a class="seo-primary-button" href="/api/adopt?sku=${encodeURIComponent(product.sku)}">Adopt ${escapeHtml(product.name)}</a>`}
              <a class="seo-secondary-button" href="/shop">Browse the Full Collection</a>
            </div>
          </section>
        </article>
        <section class="seo-product-why">
          <h2>Made once. Named once. Adopted once.</h2>
          <p>Every Sina's Creations piece is handcrafted by Thomasina Schnepf and offered as a single original. When a creation is adopted, this page remains as its permanent record.</p>
          <a href="/meet-sina">Meet Thomasina and read her story</a>
        </section>
      </main>
      ${globalFooterHtml()}
    </div>
  </div>`;
}

function productPageStyles() {
  return `<style id="product-page-css">
    .seo-product-page{max-width:1180px;margin:0 auto;padding:38px clamp(20px,5vw,56px) 72px}
    .seo-breadcrumb{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:28px;font-size:13px;color:#626552}
    .seo-breadcrumb a{text-decoration:underline;text-underline-offset:3px}
    .seo-product-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.82fr);gap:clamp(34px,6vw,76px);align-items:start}
    .seo-product-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .seo-product-gallery img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#eee9de;border-radius:4px}
    .seo-product-gallery img:first-child{grid-column:1/-1;aspect-ratio:1/1}
    .seo-product-copy{padding-top:8px}
    .seo-eyebrow{margin:0 0 12px;color:#c76a32;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.17em}
    .seo-product-copy h1{font-size:clamp(42px,6vw,72px);line-height:1;margin:0 0 10px;color:#292a28}
    .seo-sku{font-size:13px;font-weight:700;color:#626552;letter-spacing:.08em;text-transform:uppercase;margin:0 0 26px}
    .seo-product-line{font-size:clamp(20px,2.4vw,28px);line-height:1.3;font-weight:700;margin:0 0 22px;color:#292a28}
    .seo-product-story p{font-size:17px;line-height:1.75;color:#5a4434;margin:0 0 26px}
    .seo-product-details{list-style:none;padding:20px 0;margin:0 0 22px;border-top:1px solid rgba(41,42,40,.18);border-bottom:1px solid rgba(41,42,40,.18);display:grid;gap:8px;color:#626552;font-size:14px}
    .seo-product-details strong{color:#292a28}
    .seo-product-status{font-size:15px;line-height:1.6;margin:0 0 24px;color:#5a4434}
    .seo-product-actions{display:grid;gap:10px}
    .seo-primary-button,.seo-secondary-button{display:flex;align-items:center;justify-content:center;min-height:52px;padding:12px 18px;border:2px solid #eebf68;border-radius:4px;text-transform:uppercase;letter-spacing:.06em;font-size:12px;font-weight:800;text-align:center}
    .seo-primary-button{background:#eebf68;color:#171816}.seo-secondary-button{background:transparent;color:#292a28;border-color:#292a28}
    .seo-product-why{margin-top:70px;padding:34px;background:#292a28;color:#f7f4ec;border-top:3px solid #c76a32}
    .seo-product-why h2{font-size:clamp(28px,4vw,40px);margin:0 0 12px}.seo-product-why p{max-width:760px;color:rgba(247,244,236,.78);line-height:1.7;margin:0 0 14px}.seo-product-why a{color:#eebf68;text-decoration:underline;text-underline-offset:3px}
    @media(max-width:760px){.seo-product-layout{grid-template-columns:1fr}.seo-product-gallery{grid-template-columns:1fr 1fr}.seo-product-copy h1{font-size:48px}.seo-product-page{padding-top:24px}}
    @media(max-width:520px){.seo-product-page{padding-left:20px;padding-right:20px}.seo-product-gallery{grid-template-columns:1fr}.seo-product-gallery img:first-child{grid-column:auto}.seo-product-gallery img:not(:first-child){display:none}.seo-product-copy h1{font-size:42px}.seo-breadcrumb{margin-bottom:22px}}
  </style>`;
}

function productPageScript() {
  return `<script id="product-page-shell-js">
    (function () {
      var button = document.getElementById('product-menu-button');
      var menu = document.getElementById('product-mobile-menu');
      if (button && menu) {
        var bars = Array.prototype.slice.call(button.querySelectorAll('span'));
        var setOpen = function (open) {
          menu.hidden = !open;
          button.setAttribute('aria-expanded', open ? 'true' : 'false');
          button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
          bars.forEach(function (bar) { bar.classList.toggle('x', open); });
          document.body.style.overflow = open ? 'hidden' : '';
        };
        button.addEventListener('click', function () {
          setOpen(button.getAttribute('aria-expanded') !== 'true');
        });
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') setOpen(false);
        });
      }

      var search = document.querySelector('.header-catalog-search');
      if (search) {
        var input = search.querySelector('.header-catalog-search__input');
        var clear = search.querySelector('.header-catalog-search__clear');
        if (input && clear) {
          var syncClear = function () { clear.hidden = !input.value; };
          input.addEventListener('input', syncClear);
          clear.addEventListener('click', function () {
            input.value = '';
            syncClear();
            input.focus();
          });
          syncClear();
        }
      }
    }());
  </script>`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const isProductPath = url.pathname.startsWith('/p/');
  const isLegacyShopDeepLink = url.pathname === '/shop' && Boolean(url.searchParams.get('sku'));

  let sku = '';
  if (isProductPath) {
    sku = decodeURIComponent(url.pathname.slice('/p/'.length));
  } else if (isLegacyShopDeepLink) {
    sku = url.searchParams.get('sku') || '';
  }

  if (!sku) return undefined;

  const product = await findProductBySku(request, sku);
  if (!product) return undefined;

  const pageUrl = canonicalProductUrl(product);

  // Consolidate the old /shop?sku= deep links and non-normalized /p/ paths
  // onto one permanent URL. Preserve only the transient sold flag; all other
  // query/tracking parameters are intentionally excluded from canonical URLs.
  if (isLegacyShopDeepLink || `${SITE_ORIGIN}${url.pathname}` !== pageUrl) {
    const redirectUrl = new URL(pageUrl);
    if (url.searchParams.get('sold') === '1') redirectUrl.searchParams.set('sold', '1');
    return Response.redirect(redirectUrl.toString(), 308);
  }

  const indexResponse = await fetch(new URL('/index.html', request.url));
  if (!indexResponse.ok) return undefined;
  let html = await indexResponse.text();

  const label = categoryLabel(product.category);
  const title = `${product.name} — One-of-One Fused Glass ${label} | Sina's Creations`;
  const description = truncate(
    product.description || `${product.name} is a one-of-one fused-glass ${label.toLowerCase()} handcrafted by Thomasina Schnepf.`,
    160
  );
  const imageUrl = product.image?.startsWith('http') ? product.image : `${SITE_ORIGIN}${product.image || ''}`;
  const availability = product.status === 'sold-out'
    ? 'https://schema.org/SoldOut'
    : 'https://schema.org/InStock';

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    url: pageUrl,
    description: product.description || undefined,
    image: imageUrl,
    sku: product.sku,
    category: product.category || undefined,
    color: product.colorNames || undefined,
    material: 'Fused glass',
    brand: { '@type': 'Brand', name: "Sina's Creations" },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'USD',
      price: product.price,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: "Sina's Creations", url: SITE_ORIGIN },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: "Sina's Creations", item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_ORIGIN}/shop` },
      { '@type': 'ListItem', position: 3, name: product.name, item: pageUrl },
    ],
  };

  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta property="og:type"[^>]*\/?>/i,
    '<meta property="og:type" content="product" />'
  );

  const extraTags = `
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(`${product.name}, handcrafted fused glass ${label.toLowerCase()} by Thomasina Schnepf`)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="product:price:amount" content="${escapeHtml(product.price)}" />
    <meta property="product:price:currency" content="USD" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(`${product.name}, handcrafted fused glass ${label.toLowerCase()} by Thomasina Schnepf`)}" />
    <script type="application/ld+json">${safeJsonLd(productJsonLd)}</script>
    <script type="application/ld+json">${safeJsonLd(breadcrumbJsonLd)}</script>
    ${productPageStyles()}
  </head>`;

  html = html.replace('</head>', extraTags);
  html = html.replace('<div id="root"></div>', productFallbackHtml(product, imageUrl, pageUrl));
  html = html.replace('</body>', `${productPageScript()}</body>`);

  // /p/SKU is intentionally a standalone server-rendered page, not a React
  // route that immediately mutates the address into /shop?sku=. Remove the
  // Vite module bootstrap only from product responses. CSS/fonts remain.
  html = html.replace(/\s*<script type="module"[^>]*><\/script>/gi, '');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=300, stale-while-revalidate=3600',
    },
  });
}