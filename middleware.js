// Product-page SEO for the Vite/React storefront.
//
// The app is client rendered, so product requests need useful HTML before
// JavaScript runs. This middleware gives every /p/:sku URL one stable
// canonical address, product-specific metadata and structured data, and a
// small semantic product body that crawlers/link unfurlers can understand.
// React replaces the fallback body with the interactive product page after
// the app loads.

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

function productFallbackHtml(product, imageUrl, pageUrl) {
  const label = categoryLabel(product.category);
  const statusCopy = product.status === 'sold-out'
    ? `${product.name} has already found a home.`
    : `${product.name} is a one-of-one original currently available for adoption.`;
  const price = Number.isFinite(Number(product.price)) ? `$${Number(product.price).toFixed(2)}` : '';

  return `<div id="root">
    <main class="seo-product-fallback">
      <article>
        <nav aria-label="Breadcrumb"><a href="/">Sina's Creations</a> / <a href="/shop">Shop</a> / ${escapeHtml(product.name)}</nav>
        <p>One-of-One Handcrafted Fused Glass ${escapeHtml(label)}</p>
        <h1>${escapeHtml(product.name)}</h1>
        <p>SKU ${escapeHtml(product.sku)}</p>
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${product.name}, one-of-one fused glass ${label.toLowerCase()} handcrafted by Thomasina Schnepf`)}" />
        <p>${escapeHtml(product.description || product.line || statusCopy)}</p>
        <p>${escapeHtml(statusCopy)}${price ? ` ${escapeHtml(price)}.` : ''}</p>
        ${product.status === 'sold-out'
          ? '<a href="/shop">Browse available creations</a>'
          : `<a href="/api/adopt?sku=${encodeURIComponent(product.sku)}">Adopt ${escapeHtml(product.name)}</a>`}
        <p><a href="${escapeHtml(pageUrl)}">Permanent link to ${escapeHtml(product.name)}</a></p>
      </article>
    </main>
  </div>`;
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
  </head>`;

  html = html.replace('</head>', extraTags);
  html = html.replace('<div id="root"></div>', productFallbackHtml(product, imageUrl, pageUrl));

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=300, stale-while-revalidate=3600',
    },
  });
}
