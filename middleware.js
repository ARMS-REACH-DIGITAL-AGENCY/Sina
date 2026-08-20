// This site is a client-rendered React SPA (Vite + react-router), so every
// route -- including all 274 product pages -- serves the exact same static
// index.html to start, with the same generic title/description. Real
// content only appears after JS runs. Google eventually renders JS, but
// search snippets are unreliable that way, and social/chat link previews
// (Facebook, X, iMessage, Slack) don't run JS at all -- they'd show the
// site's generic OG image/title no matter which product got shared.
//
// This intercepts requests for a specific product (the /p/:sku short link,
// or /shop?sku=... direct links) at Vercel's edge, before the SPA shell is
// served, and rewrites the <title>/description and injects Open Graph,
// Twitter Card, and Product structured data for that one piece. Everything
// else -- normal browsing, client-side routing once the page loads -- is
// completely unaffected; this only changes what the very first HTML
// response contains for these specific URLs.

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
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
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

export default async function middleware(request) {
  const url = new URL(request.url);
  let sku = '';

  if (url.pathname.startsWith('/p/')) {
    sku = decodeURIComponent(url.pathname.slice('/p/'.length));
  } else if (url.pathname === '/shop') {
    sku = url.searchParams.get('sku') || '';
  }

  if (!sku) return undefined;

  const product = await findProductBySku(request, sku);
  if (!product) return undefined;

  const indexResponse = await fetch(new URL('/index.html', request.url));
  if (!indexResponse.ok) return undefined;
  let html = await indexResponse.text();

  const title = `${product.name} — ${product.category} | Sina's Creations`;
  const description = truncate(
    product.description || `A one-of-one fused-glass creation by Thomasina Schnepf.`,
    160
  );
  const pageUrl = `${url.origin}${url.pathname}${url.search}`;
  const imageUrl = product.image.startsWith('http') ? product.image : `${url.origin}${product.image}`;

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: imageUrl,
    sku: product.sku,
    brand: { '@type': 'Brand', name: "Sina's Creations" },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: product.price,
      availability: product.status === 'sold-out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: pageUrl,
    },
  };

  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  const extraTags = `
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Sina's Creations" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <script type="application/ld+json">${JSON.stringify(productJsonLd)}</script>
  </head>`;

  html = html.replace('</head>', extraTags);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=300, stale-while-revalidate=3600',
    },
  });
}
