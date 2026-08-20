// Served as an API route (not a static /public file) so it can never
// collide with vercel.json's catch-all SPA rewrite, and so it always lists
// the live, current set of products instead of going stale the moment a
// piece is added, sold, or renamed.

const SITE_ORIGIN = 'https://sinasglass.com';

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
    const updatedAt = (data.updatedAt || new Date().toISOString()).slice(0, 10);

    const urls = [
      ...STATIC_PATHS.map((path) => ({ loc: `${SITE_ORIGIN}${path}`, priority: path === '/' ? '1.0' : '0.7' })),
      ...(data.products || []).map((product) => ({
        loc: `${SITE_ORIGIN}/p/${encodeURIComponent(product.sku)}`,
        priority: '0.8',
      })),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) =>
      `  <url><loc>${escapeXml(url.loc)}</loc><lastmod>${updatedAt}</lastmod><priority>${url.priority}</priority></url>`
  )
  .join('\n')}
</urlset>
`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch (error) {
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(error.message)}</error>`);
  }
}
