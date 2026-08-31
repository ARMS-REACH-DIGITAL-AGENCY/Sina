// Dynamic sitemap: always reflects the live Google Sheet/Shopify-backed catalog.
// The canonical public domain is www.sinascreations.com, matching the production
// redirect and every per-product canonical URL.

const SITE_ORIGIN = 'https://www.sinascreations.com';

const STATIC_PATHS = ['/', '/meet-sina', '/commission', '/wholesale', '/shop', '/schedule'];

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  try {
    const response = await fetch(`${SITE_ORIGIN}/api/catalog`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`catalog fetch failed (${response.status})`);
    const data = await response.json();

    const urls = [
      ...STATIC_PATHS.map((path) => ({ loc: `${SITE_ORIGIN}${path}` })),
      ...(data.products || []).map((product) => ({
        loc: `${SITE_ORIGIN}/p/${encodeURIComponent(product.sku)}`,
      })),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeXml(url.loc)}</loc></url>`).join('\n')}
</urlset>
`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch (error) {
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(error.message)}</error>`);
  }
}
