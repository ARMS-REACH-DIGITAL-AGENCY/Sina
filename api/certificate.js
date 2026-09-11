// Certificate of Adoption -- generate one for a piece, by SKU.
//
//   /api/certificate?sku=PND-SM-WW-001&adopter=Pete%20DeLuca&adopted=2026-08-23
//
// SKU is the key rather than an order id on purpose: pieces sell at craft fairs
// and hand to hand as often as they sell through Shopify, and those adoptions
// have no order behind them. Anything that can name a SKU and an adopter can
// mint a certificate.
//
// Add &format=html to get the document as HTML instead of PDF. That path skips
// Chromium entirely, which makes it the fast way to check a layout change.

const { isAdminKeyValid } = require('../lib/sina-config.js');
const { shopifyGraphql } = require('../lib/shopify.js');
const { buildCertificateHtml } = require('../lib/certificate.js');
const { verifyAdoption } = require('../lib/adoption-token.js');

// Tags that describe the piece rather than what it's made of. Sina tags fairly
// freely, so this is a denylist of the predictable noise; anything left over
// that matches a known material is what lands on the certificate.
const MATERIAL_METALS = ['copper', 'silver', 'gold', 'brass'];

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

// Descriptions follow a fixed shape, written by the sync:
//   <p><strong>Headline</strong></p><p>Story…</p><p><em>1-of-1. Handcrafted…</em></p>
// The trailing italic paragraph is boilerplate that the certificate states in
// its own words, so it is dropped rather than repeated.
function parseDescription(descriptionHtml) {
  const html = String(descriptionHtml || '');
  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);

  let tagline = '';
  let story = '';

  for (const p of paragraphs) {
    const strong = p.match(/^<strong>([\s\S]*?)<\/strong>$/i);
    if (strong && !tagline) {
      tagline = stripTags(strong[1]);
      continue;
    }
    // The boilerplate is wholly italic; real story copy never is.
    if (/^<em>[\s\S]*<\/em>$/i.test(p)) continue;
    if (!story) story = stripTags(p);
  }

  return { tagline, story };
}

function stripTags(value) {
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "Fused glass" is true of everything Sina makes. The wire is the part that
// varies, and only wire-wrapped SKUs actually have any.
function describeMaterials(tags, sku) {
  const lower = (tags || []).map((t) => String(t).toLowerCase());
  const metal = MATERIAL_METALS.find((m) => lower.includes(m));
  if (!metal) return 'Fused glass';
  const isWireWrapped = /-WW-/i.test(String(sku || ''));
  return isWireWrapped ? `Fused glass, ${metal} wire` : `Fused glass, ${metal}`;
}

function formatAdoptedOn(value) {
  // No date supplied means the piece is being certified as it ships, so today
  // is the honest answer rather than a blank line.
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

async function fetchPieceBySku(sku) {
  const data = await shopifyGraphql(
    `query($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            title
            descriptionHtml
            tags
            featuredImage { url altText }
            media(first: 10) { edges { node { ... on MediaImage { image { url altText } } } } }
            variants(first: 1) { edges { node { sku } } }
          }
        }
      }
    }`,
    { query: `sku:${sku}` },
  );

  const node = data && data.products && data.products.edges[0] && data.products.edges[0].node;
  if (!node) return null;

  // Guard against the Living Mosaic crop -- a background-free tile shot that is
  // alt-tagged "mosaic" -- ever standing in as the portrait on a certificate.
  // featuredImage is normally the listing photo, but if a mosaic crop has been
  // promoted to first position this falls through to the next real image.
  const isMosaic = (alt) => String(alt || '').trim().toLowerCase() === 'mosaic';
  let imageUrl = node.featuredImage && !isMosaic(node.featuredImage.altText)
    ? node.featuredImage.url
    : null;

  if (!imageUrl) {
    const media = (node.media && node.media.edges ? node.media.edges : [])
      .map((e) => e.node && e.node.image)
      .filter(Boolean);
    const usable = media.find((img) => !isMosaic(img.altText));
    imageUrl = usable ? usable.url : null;
  }

  return {
    title: node.title,
    descriptionHtml: node.descriptionHtml,
    tags: node.tags || [],
    imageUrl,
    sku: (node.variants && node.variants.edges[0] && node.variants.edges[0].node.sku) || sku,
  };
}

// Inlined as a data URI rather than left as a URL: Chromium is told not to make
// network requests while printing, so a remote <img> would silently render as a
// blank plate and the failure would only show up on a finished certificate.
async function fetchPhotoDataUri(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    return null;
  }
}

async function renderPdf(html) {
  // @sparticuz/chromium ships as ESM with a CJS interop wrapper, so under
  // require() the real object sits on .default -- reading `args` off the
  // wrapper gets undefined and launch fails with a confusing TypeError.
  // Tolerating both shapes keeps a future packaging change from breaking this.
  const chromiumModule = require('@sparticuz/chromium');
  const chromium = chromiumModule.default || chromiumModule;
  const puppeteer = require('puppeteer-core');

  // Set locally to point at a system Chrome; unset in production so the
  // bundled serverless build is used.
  const executablePath = process.env.CHROME_EXECUTABLE_PATH
    || await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 816, height: 1056 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    // Fonts are embedded as data URIs, but the faces still have to finish
    // decoding or the first print can come out in a fallback serif.
    await page.evaluateHandle('document.fonts.ready');
    return await page.pdf({
      width: '8.5in',
      height: '11in',
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const params = url.searchParams;

  // Two ways in. The admin key is for Pete or Sina minting one by hand. The
  // signed token is what goes out in the adopter's email -- and because the
  // token carries its own SKU and adopter, holding one link doesn't let anyone
  // mint a certificate for a different piece by editing the query string.
  // verifyAdoption throws when the secret isn't configured; the admin path
  // should still work in that case, so a failure here just means "no token".
  let adoption = null;
  try {
    if (params.get('t')) adoption = verifyAdoption(params.get('t'));
  } catch (error) {
    adoption = null;
  }

  if (!adoption && !isAdminKeyValid(params.get('key'))) {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  const sku = ((adoption ? adoption.sku : params.get('sku')) || '').trim();
  const adopter = ((adoption ? adoption.adopter : params.get('adopter')) || '').trim();
  if (!sku) return sendJson(res, 400, { error: 'sku is required' });
  if (!adopter) return sendJson(res, 400, { error: 'adopter is required' });

  try {
    const product = await fetchPieceBySku(sku);
    if (!product) return sendJson(res, 404, { error: `No product found for SKU ${sku}` });

    const { tagline, story } = parseDescription(product.descriptionHtml);

    const html = await buildCertificateHtml({
      name: product.title,
      tagline,
      story,
      sku: product.sku,
      materials: params.get('materials') || describeMaterials(product.tags, product.sku),
      adopter,
      adoptedOn: formatAdoptedOn(adoption ? adoption.adoptedOn : params.get('adopted')),
      // Deliberately the short form, not the signed token the webhook emails.
      // This string is printed on the certificate and encoded in the QR, and a
      // signed token runs past 120 characters -- unusable to read or retype.
      // The upload page will resolve a short code back to a SKU instead.
      uploadUrl: params.get('upload') || `sinascreations.com/u/${encodeURIComponent(sku)}`,
      photo: await fetchPhotoDataUri(product.imageUrl),
    });

    if (params.get('format') === 'html') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(html);
    }

    const pdf = await renderPdf(html);
    const filename = `Certificate-of-Adoption-${product.title.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.end(pdf);
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};

// Exposed for tests. Description parsing is the part most likely to drift
// silently as product copy is edited, so it needs to be checkable without
// standing up Shopify.
module.exports.parseDescription = parseDescription;
module.exports.describeMaterials = describeMaterials;
module.exports.formatAdoptedOn = formatAdoptedOn;
