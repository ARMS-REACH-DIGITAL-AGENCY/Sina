// Permanent product-page SEO for the Vite/React storefront.
// /p/:sku stays server-rendered and canonical while visually matching the
// shop's open product-card experience.

const SITE_ORIGIN = 'https://www.sinascreations.com';

export const config = { matcher: ['/p/:sku*', '/shop'] };

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const response = await fetch(new URL('/api/catalog', request.url), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const target = sku.trim().toUpperCase();
    return (data.products || []).find((product) => product.sku === target) || null;
  } catch (error) {
    return null;
  }
}

function productGalleryUrls(product, primaryImageUrl) {
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
  return urls.slice(0, 4);
}

function openCardDescriptionHtml(product) {
  if (product.descriptionHtml) {
    let html = String(product.descriptionHtml)
      .replace(/\[\[SIZE_TBD\]\]/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .trim();

    if (product.line) {
      const escaped = escapeRegExp(product.line);
      html = html.replace(
        new RegExp(`^\\s*<p>\\s*<strong>\\s*${escaped}\\s*<\\/strong>\\s*<\\/p>`, 'i'),
        ''
      ).trim();
    }
    return html;
  }

  let description = String(product.description || '').trim();
  const line = String(product.line || '').trim();
  if (line && description.toLowerCase().startsWith(line.toLowerCase())) {
    description = description.slice(line.length).trim().replace(/^[-–—:]+\s*/, '');
  }
  return description ? `<p>${escapeHtml(description)}</p>` : '';
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
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>
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
        <div class="footer-legal__links"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms &amp; Messaging Terms</a></div>
        <p class="footer-copyright">&copy; 2026 Sina's Creations &middot; sinascreations.com &middot; Queen Creek, AZ</p>
        <p class="footer-powered">Powered by <a href="https://armsreachdigital.agency" target="_blank" rel="noopener noreferrer">ARMS REACH Digital Agency</a></p>
      </div>
    </div>
  </footer>`;
}

function shareIconHtml() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
}

function productOpenCardHtml(product, imageUrl) {
  const isSold = product.status === 'sold-out';
  const gallery = productGalleryUrls(product, imageUrl);
  const mainImage = gallery[0] || imageUrl;
  const descriptionHtml = openCardDescriptionHtml(product);
  const hasDimensions = Boolean(product.height || product.width || product.weight);
  const eyebrow = escapeHtml(product.category || categoryLabel(product.category));
  const price = Number.isFinite(Number(product.price)) ? Number(product.price).toFixed(0) : escapeHtml(product.price);

  const thumbs = gallery.length > 1
    ? `<div class="product-card__thumbs seo-card-thumbs" aria-label="${escapeHtml(product.name)} image gallery">
        ${gallery.map((url, index) => `<button type="button" class="product-card__thumb seo-card-thumb${index === 0 ? ' active' : ''}" data-gallery-src="${escapeHtml(url)}" aria-label="View image ${index + 1} for ${escapeHtml(product.name)}"><img src="${escapeHtml(url)}" alt="" loading="lazy" /></button>`).join('')}
      </div>`
    : '';

  return `<main class="seo-product-page">
    <article class="seo-open-card${isSold ? ' is-sold' : ''}">
      <section class="product-card__panel seo-card-panel">
        <div class="sku-row seo-card-sku-row"><span>${eyebrow}</span><strong>SKU ${escapeHtml(product.sku)}</strong></div>
        <h1 class="seo-card-title">${escapeHtml(product.name)}</h1>
        ${product.line ? `<p class="product-card__line seo-card-line">${escapeHtml(product.line)}</p>` : ''}
        ${descriptionHtml ? `<div class="product-card__description-shell seo-card-description-shell"><div class="product-card__description seo-card-description">${descriptionHtml}</div></div>` : ''}
        ${hasDimensions ? `<div class="product-card__dimensions seo-card-dimensions">
          ${product.height ? `<span>H ${escapeHtml(product.height)}&Prime;</span>` : ''}
          ${product.width ? `<span>W ${escapeHtml(product.width)}&Prime;</span>` : ''}
          ${product.weight ? `<span>${escapeHtml(product.weight)} oz</span>` : ''}
        </div>` : ''}
        <div class="price-row seo-card-price-row">
          <strong>$${price}</strong>
          <div class="price-row__cost-share seo-card-cost-share">
            <span class="product-card__flip-cta-caption">Cost to adopt this <span class="nowrap">1-of-1</span> original</span>
            <button type="button" class="product-card__share seo-card-share" id="seo-product-share" aria-label="Share ${escapeHtml(product.name)}">${shareIconHtml()}</button>
          </div>
        </div>
        ${isSold
          ? `<span class="button primary product-card__adopt-cta seo-card-adopt is-sold" aria-disabled="true">${escapeHtml(product.name)} Found a Home!</span>`
          : `<a class="button primary product-card__adopt-cta seo-card-adopt" href="/api/adopt?sku=${encodeURIComponent(product.sku)}">Adopt Me</a>`}
      </section>

      <section class="product-card__visual seo-card-visual" aria-label="Photos of ${escapeHtml(product.name)}">
        <div class="product-card__image seo-card-main-image">
          <img id="seo-product-main-image" src="${escapeHtml(mainImage)}" alt="${escapeHtml(`${product.name}, ${categoryLabel(product.category)} by Sina's Creations`)}" fetchpriority="high" />
          <span class="product-card__one-of-one"><span class="nowrap">1-of-1</span></span>
        </div>
        ${thumbs}
      </section>
    </article>
  </main>`;
}

function productFallbackHtml(product, imageUrl) {
  return `<div id="root"><div class="site-shell">${globalHeaderHtml()}${productOpenCardHtml(product, imageUrl)}${globalFooterHtml()}</div></div>`;
}

function productPageStyles() {
  return `<style id="product-page-css">
    .seo-product-page{max-width:1200px;margin:0 auto;padding:18px var(--page-gutter) 72px}
    .seo-open-card{display:grid;grid-template-columns:minmax(0,1.28fr) minmax(390px,1fr);background:var(--off-white);border:1px solid rgba(41,42,40,.22);border-radius:var(--radius);overflow:hidden;box-shadow:2px 3px 0 rgba(41,42,40,.12);min-height:560px}
    .seo-card-panel{grid-column:1;padding:38px 34px 30px;min-width:0;background:var(--off-white);display:flex;flex-direction:column;align-items:stretch}
    .seo-card-visual{grid-column:2;min-width:0;background:var(--black);display:flex;flex-direction:column;align-self:stretch}
    .seo-card-sku-row{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:10px}
    .seo-card-sku-row>span{color:var(--burnt-orange);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
    .seo-card-sku-row>strong{background:rgba(41,42,40,.06);padding:7px 9px;font-size:10px;line-height:1.2;text-transform:uppercase;white-space:nowrap}
    .seo-card-title{margin:0;font-size:clamp(34px,4vw,48px);line-height:1.02;color:var(--charcoal);letter-spacing:-.035em}
    .seo-card-line{margin:4px 0 18px;color:var(--muted-olive);font-size:18px;font-weight:700;line-height:1.25}
    .seo-card-description-shell{margin-top:0}
    .seo-card-description,.seo-card-description p{color:var(--muted-olive);font-size:16px;line-height:1.6}
    .seo-card-description p{margin:0 0 12px}.seo-card-description p:last-child{margin-bottom:0}
    .seo-card-dimensions{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-top:22px;padding:14px 0;border-top:1px solid rgba(41,42,40,.2);border-bottom:1px solid rgba(41,42,40,.2);color:var(--muted-olive);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    .seo-card-price-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-top:18px;padding-top:0}
    .seo-card-price-row>strong{font-size:30px;line-height:1;color:var(--charcoal)}
    .seo-card-cost-share{display:flex;align-items:center;gap:12px;margin-left:auto}
    .seo-card-cost-share .product-card__flip-cta-caption{max-width:190px;text-align:right;color:var(--muted-olive);font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;line-height:1.2}
    .seo-card-share{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:0;background:transparent;color:var(--charcoal);cursor:pointer;padding:7px}
    .seo-card-share svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .seo-card-adopt{width:100%;margin-top:20px;min-height:54px}.seo-card-adopt.is-sold{opacity:.72}
    .seo-card-main-image{position:relative;flex:1 1 auto;min-height:500px;background:#e8e4da;overflow:hidden}
    .seo-card-main-image>img{width:100%;height:100%;min-height:500px;object-fit:cover;object-position:center}
    .seo-card-main-image .product-card__one-of-one{position:absolute;left:18px;bottom:18px;background:rgba(41,42,40,.88);color:var(--off-white);border-radius:999px;padding:8px 13px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .seo-card-thumbs{display:flex;align-items:center;gap:10px;min-height:92px;padding:12px 14px;background:var(--black);overflow-x:auto}
    .seo-card-thumb{flex:0 0 62px;width:62px;height:62px;padding:0;border:2px solid transparent;background:#292a28;border-radius:2px;overflow:hidden;cursor:pointer}
    .seo-card-thumb.active{border-color:var(--sand)}
    .seo-card-thumb img{width:100%;height:100%;object-fit:cover}
    @media(max-width:760px){
      .seo-product-page{padding:16px 16px 56px}
      .seo-open-card{grid-template-columns:1fr;min-height:0}
      .seo-card-visual{grid-column:1;grid-row:1}
      .seo-card-panel{grid-column:1;grid-row:2;padding:28px 24px 26px}
      .seo-card-main-image,.seo-card-main-image>img{min-height:0}
      .seo-card-main-image>img{aspect-ratio:1/1;object-fit:cover}
      .seo-card-title{font-size:40px}
      .seo-card-line{font-size:18px}
    }
    @media(max-width:480px){
      .seo-product-page{padding:12px 12px 46px}
      .seo-card-panel{padding:24px 20px}
      .seo-card-sku-row{align-items:center}
      .seo-card-sku-row>strong{white-space:normal;text-align:right}
      .seo-card-price-row{align-items:flex-end}
      .seo-card-cost-share .product-card__flip-cta-caption{max-width:140px}
      .seo-card-thumbs{min-height:82px;padding:10px 12px}
      .seo-card-thumb{flex-basis:56px;width:56px;height:56px}
    }
  </style>`;
}

function productPageScript(product) {
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
        button.addEventListener('click', function () { setOpen(button.getAttribute('aria-expanded') !== 'true'); });
        document.addEventListener('keydown', function (event) { if (event.key === 'Escape') setOpen(false); });
      }

      var search = document.querySelector('.header-catalog-search');
      if (search) {
        var input = search.querySelector('.header-catalog-search__input');
        var clear = search.querySelector('.header-catalog-search__clear');
        if (input && clear) {
          var syncClear = function () { clear.hidden = !input.value; };
          input.addEventListener('input', syncClear);
          clear.addEventListener('click', function () { input.value = ''; syncClear(); input.focus(); });
          syncClear();
        }
      }

      var mainImage = document.getElementById('seo-product-main-image');
      var thumbs = Array.prototype.slice.call(document.querySelectorAll('.seo-card-thumb'));
      thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          if (!mainImage) return;
          mainImage.src = thumb.getAttribute('data-gallery-src');
          thumbs.forEach(function (item) { item.classList.remove('active'); });
          thumb.classList.add('active');
        });
      });

      var share = document.getElementById('seo-product-share');
      if (share) {
        share.addEventListener('click', async function () {
          var url = window.location.href;
          var title = ${JSON.stringify(`${product.name} — Sina's Creations`)};
          var text = ${JSON.stringify(`${product.name}\n${product.line || ''}\nOne-of-one, handcrafted by Thomasina Schnepf.`)};
          if (navigator.share) {
            try { await navigator.share({ title: title, text: text, url: url }); return; }
            catch (error) { if (error && error.name === 'AbortError') return; }
          }
          if (navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(url);
              share.setAttribute('aria-label', 'Link copied');
              window.setTimeout(function () { share.setAttribute('aria-label', 'Share ${escapeHtml(product.name)}'); }, 1800);
            } catch (error) {}
          }
        });
      }
    }());
  </script>`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const isProductPath = url.pathname.startsWith('/p/');
  const isLegacyShopDeepLink = url.pathname === '/shop' && Boolean(url.searchParams.get('sku'));

  let sku = '';
  if (isProductPath) sku = decodeURIComponent(url.pathname.slice('/p/'.length));
  else if (isLegacyShopDeepLink) sku = url.searchParams.get('sku') || '';
  if (!sku) return undefined;

  const product = await findProductBySku(request, sku);
  if (!product) return undefined;

  const pageUrl = canonicalProductUrl(product);
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
  const description = truncate(product.description || `${product.name} is a one-of-one fused-glass ${label.toLowerCase()} handcrafted by Thomasina Schnepf.`, 160);
  const imageUrl = product.image?.startsWith('http') ? product.image : `${SITE_ORIGIN}${product.image || ''}`;
  const availability = product.status === 'sold-out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock';

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
      '@type': 'Offer', url: pageUrl, priceCurrency: 'USD', price: product.price,
      availability, itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: "Sina's Creations", url: SITE_ORIGIN },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: "Sina's Creations", item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_ORIGIN}/shop` },
      { '@type': 'ListItem', position: 3, name: product.name, item: pageUrl },
    ],
  };

  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description"[^>]*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:type"[^>]*\/?>/i, '<meta property="og:type" content="product" />');

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
  html = html.replace('<div id="root"></div>', productFallbackHtml(product, imageUrl));
  html = html.replace('</body>', `${productPageScript(product)}</body>`);
  html = html.replace(/\s*<script type="module"[^>]*><\/script>/gi, '');

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=300, stale-while-revalidate=3600',
    },
  });
}