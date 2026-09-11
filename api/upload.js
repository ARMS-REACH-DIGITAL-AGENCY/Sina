// Adopter photo upload -- "send us a photo of it in its new home".
//
//   GET  /u/:token           -> the page (rewritten to this route in vercel.json)
//   POST /api/upload?t=…     -> {action:'stage'}  mint a Shopify upload target
//   POST /api/upload?t=…     -> {action:'attach'} attach the uploaded file
//
// The browser uploads the file DIRECTLY to Shopify's staged target rather than
// posting it through this function. Vercel caps a request body at 4.5MB and a
// photo straight off a phone is routinely 3-8MB, so proxying the bytes would
// reject a large share of real uploads. This way the function only ever handles
// small JSON.
//
// Nothing goes live unreviewed: media is attached with alt text prefixed
// `owner-pending:`. Sina approves a photo by editing that prefix to `owner:`,
// the same alt-text-as-tag convention the Living Mosaic already uses.

const { shopifyGraphql } = require('../lib/shopify.js');
const { verifyAdoption, shortCodeForSku, SHORT_CODE_LENGTH } = require('../lib/adoption-token.js');

const PENDING_PREFIX = 'owner-pending:';
const APPROVED_PREFIX = 'owner:';

// A token is long-lived and printed on a certificate, so it can't be a
// write-as-much-as-you-like credential. Six is generous for "a photo of me
// wearing it" and low enough that a leaked link can't fill the product page.
const MAX_PHOTOS_PER_PIECE = 6;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function sendHtml(res, statusCode, html) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

async function fetchPiece(sku) {
  const data = await shopifyGraphql(
    `query($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
            featuredImage { url altText }
            media(first: 50) { edges { node { alt } } }
          }
        }
      }
    }`,
    { query: `sku:${sku}` },
  );

  const node = data && data.products && data.products.edges[0] && data.products.edges[0].node;
  if (!node) return null;

  const alts = ((node.media && node.media.edges) || []).map((e) => String((e.node && e.node.alt) || ''));
  return {
    id: node.id,
    title: node.title,
    imageUrl: node.featuredImage ? node.featuredImage.url : null,
    ownerPhotoCount: alts.filter(
      (alt) => alt.startsWith(PENDING_PREFIX) || alt.startsWith(APPROVED_PREFIX),
    ).length,
  };
}

// Short codes aren't reversible, so resolving one means deriving the code for
// every SKU and looking for the match. That's two Shopify pages for a ~450
// piece catalog, and only on the printed-code path -- a scanned QR carries the
// full token and never gets here.
async function resolveShortCode(code) {
  const wanted = String(code).trim().toUpperCase();
  let cursor = null;

  for (let page = 0; page < 6; page += 1) {
    const data = await shopifyGraphql(
      `query($cursor: String) {
        products(first: 250, after: $cursor, query: "tag:sheet-sync") {
          edges { cursor node { variants(first: 1) { edges { node { sku } } } } }
          pageInfo { hasNextPage }
        }
      }`,
      { cursor },
    );

    const edges = (data && data.products && data.products.edges) || [];
    for (const edge of edges) {
      const sku = edge.node.variants.edges[0] && edge.node.variants.edges[0].node.sku;
      if (sku && shortCodeForSku(sku) === wanted) return sku;
    }
    if (!data.products.pageInfo.hasNextPage || !edges.length) break;
    cursor = edges[edges.length - 1].cursor;
  }
  return null;
}

// Two ways in, both arriving as ?t=. The full signed token comes from an
// emailed link or a scanned QR and names the adopter as well as the piece. The
// short code is what's printed on the certificate for someone typing it in,
// and only names the piece.
async function readAdoption(params) {
  const value = params.get('t');
  if (!value) return null;

  try {
    const adoption = verifyAdoption(value);
    if (adoption) return adoption;

    if (value.length === SHORT_CODE_LENGTH && !value.includes('.')) {
      const sku = await resolveShortCode(value);
      if (sku) return { sku, adopter: null };
    }
    return null;
  } catch (error) {
    // Thrown when ADOPTION_TOKEN_SECRET isn't configured. Treat as no token
    // rather than leaking a config error onto a customer-facing page.
    return null;
  }
}

// ------------------------------------------------------------------ the page

function pageShell(inner, title) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${esc(title)} — Sina's Creations</title>
<link rel="icon" type="image/png" href="/assets/brand/sinas-creations-favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --charcoal:#292A28; --warm-cream:#EEE9DE; --off-white:#F7F4EC;
    --sand:#D9A15B; --burnt-orange:#C76A32; --earth-brown:#5A4434; --olive:#626552;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    background:var(--warm-cream); color:var(--charcoal);
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    line-height:1.6; -webkit-font-smoothing:antialiased;
    min-height:100vh; display:flex; flex-direction:column; align-items:center;
    padding:28px 20px 56px;
  }
  .card{
    width:100%; max-width:520px; background:var(--off-white);
    border:1.5px solid var(--charcoal); padding:30px 24px 28px; text-align:center;
  }
  .logo{width:132px;margin:0 auto 18px;display:block}
  .eyebrow{
    font-size:10px; font-weight:600; letter-spacing:.28em;
    text-transform:uppercase; color:var(--burnt-orange);
  }
  hr{border:0;border-top:.75px solid rgba(41,42,40,.22);margin:14px 0 18px}
  h1{
    font-family:'Cormorant Garamond',Georgia,serif; font-weight:600;
    font-size:42px; line-height:1.02; letter-spacing:-.015em; margin-bottom:4px;
  }
  .lede{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:17px;color:var(--olive)}
  .piece-photo{
    width:150px;height:150px;object-fit:cover;margin:20px auto 0;display:block;
    border:.75px solid rgba(41,42,40,.3);
  }
  p.blurb{font-size:15px;margin:18px 0 0;color:var(--earth-brown)}
  /* The whole drop zone is the label, so tapping anywhere opens the picker --
     a 44px button is a poor target on the phones most of these arrive from. */
  label.picker{
    display:block;margin-top:22px;padding:26px 18px;cursor:pointer;
    border:1.5px dashed rgba(41,42,40,.35); background:var(--warm-cream);
    font-size:15px;font-weight:600;
  }
  label.picker small{display:block;font-weight:400;font-size:12.5px;color:var(--olive);margin-top:6px}
  input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  #preview{display:none;width:100%;margin-top:18px;border:.75px solid rgba(41,42,40,.3)}
  button{
    margin-top:18px;width:100%;min-height:52px;padding:14px 22px;cursor:pointer;
    background:var(--burnt-orange);color:var(--off-white);border:2px solid var(--burnt-orange);
    font-family:'Inter',sans-serif;font-size:13px;font-weight:600;
    letter-spacing:.06em;text-transform:uppercase;
  }
  button[disabled]{opacity:.45;cursor:not-allowed}
  .note{margin-top:16px;font-size:12.5px;color:var(--olive);line-height:1.5}
  .msg{margin-top:16px;font-size:14px;font-weight:600}
  .msg.err{color:#A3301B}
  .msg.ok{color:#3F6B43}
  .done h1{font-size:34px}
</style>
</head><body><div class="card">
  <img class="logo" src="/assets/brand/sinas-creations-black-logo.png" alt="Sina's Creations">
  ${inner}
</div></body></html>`;
}

function uploadPage(piece, adoption, token) {
  const name = esc(piece.title);
  const full = piece.ownerPhotoCount >= MAX_PHOTOS_PER_PIECE;

  const photo = piece.imageUrl
    ? `<img class="piece-photo" src="${esc(piece.imageUrl)}" alt="${name}">`
    : '';

  if (full) {
    return pageShell(`
      <div class="eyebrow">Thank you</div><hr>
      <h1>${name}</h1>
      ${photo}
      <p class="blurb">We already have every photo we can show for ${name}.
         Thank you &mdash; nothing more is needed.</p>
    `, name);
  }

  return pageShell(`
    <div class="eyebrow">Share your creation</div><hr>
    <h1>${name}</h1>
    ${adoption.adopter ? `<div class="lede">now lives with ${esc(adoption.adopter)}</div>` : ''}
    ${photo}
    <p class="blurb">Send us a photo of ${name} in its new home. Once Sina has
       seen it, it joins ${name}'s page &mdash; so the next person who finds it
       sees where it went.</p>

    <label class="picker" for="file">
      Choose or take a photo
      <small>JPEG, PNG, WEBP or HEIC &middot; up to 25MB</small>
      <input type="file" id="file" accept="image/*">
    </label>
    <img id="preview" alt="">
    <button id="send" disabled>Send to Sina</button>
    <div class="msg" id="msg"></div>
    <p class="note">Your photo is reviewed before it appears. It will never be
       published with your name, address or any order details.</p>

<script>
(function () {
  var TOKEN = ${JSON.stringify(token)};
  var fileInput = document.getElementById('file');
  var preview = document.getElementById('preview');
  var send = document.getElementById('send');
  var msg = document.getElementById('msg');
  var chosen = null;

  function say(text, kind) { msg.textContent = text; msg.className = 'msg ' + (kind || ''); }

  fileInput.addEventListener('change', function () {
    chosen = fileInput.files && fileInput.files[0];
    if (!chosen) return;
    if (chosen.size > ${MAX_BYTES}) {
      say('That photo is larger than 25MB. Try a smaller one.', 'err');
      chosen = null; send.disabled = true; return;
    }
    say('');
    // A HEIC straight off an iPhone won't render in most browsers; the upload
    // still works, so just skip the preview rather than showing a broken image.
    try {
      preview.src = URL.createObjectURL(chosen);
      preview.style.display = 'block';
    } catch (e) { preview.style.display = 'none'; }
    send.disabled = false;
  });

  send.addEventListener('click', async function () {
    if (!chosen) return;
    send.disabled = true;
    say('Uploading…');

    try {
      var api = '/api/upload?t=' + encodeURIComponent(TOKEN);

      var staged = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stage',
          filename: chosen.name || 'photo.jpg',
          mimeType: chosen.type || 'image/jpeg',
          fileSize: String(chosen.size)
        })
      }).then(function (r) { return r.json(); });
      if (!staged.ok) throw new Error(staged.error || 'Could not start the upload.');

      // Straight to Shopify's storage, not back through our server.
      var form = new FormData();
      staged.parameters.forEach(function (p) { form.append(p.name, p.value); });
      form.append('file', chosen);
      var put = await fetch(staged.url, { method: 'POST', body: form });
      if (!put.ok) throw new Error('The upload did not complete. Please try again.');

      var attached = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attach', resourceUrl: staged.resourceUrl })
      }).then(function (r) { return r.json(); });
      if (!attached.ok) throw new Error(attached.error || 'Could not save the photo.');

      document.querySelector('.card').innerHTML =
        '<img class="logo" src="/assets/brand/sinas-creations-black-logo.png" alt="Sina\\'s Creations">' +
        '<div class="eyebrow">Received</div><hr>' +
        '<div class="done"><h1>Thank you</h1></div>' +
        '<p class="blurb">Sina will see your photo of ' + ${JSON.stringify(piece.title)} +
        ' shortly. Once she has, it joins its page.</p>';
    } catch (err) {
      say(err.message || 'Something went wrong. Please try again.', 'err');
      send.disabled = false;
    }
  });
})();
</script>
  `, name);
}

function errorPage(message) {
  return pageShell(`
    <div class="eyebrow">Sina's Creations</div><hr>
    <h1>This link isn't valid</h1>
    <p class="blurb">${esc(message)}</p>
    <p class="note">If you adopted a creation and want to send a photo,
       reply to your shipping email and we'll sort it out.</p>
  `, 'Link not valid');
}

// ----------------------------------------------------------------- handlers

async function handleStage(res, body) {
  const mimeType = String(body.mimeType || '').toLowerCase();
  const fileSize = Number(body.fileSize || 0);

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return sendJson(res, 400, { ok: false, error: 'That file type is not supported.' });
  }
  if (!fileSize || fileSize > MAX_BYTES) {
    return sendJson(res, 400, { ok: false, error: 'That photo is larger than 25MB.' });
  }

  const data = await shopifyGraphql(
    `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [{
        filename: String(body.filename || 'photo.jpg').slice(0, 120),
        mimeType,
        fileSize: String(fileSize),
        resource: 'IMAGE',
        httpMethod: 'POST',
      }],
    },
  );

  const result = data && data.stagedUploadsCreate;
  const errors = (result && result.userErrors) || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));

  const target = result.stagedTargets && result.stagedTargets[0];
  if (!target) throw new Error('Shopify did not return an upload target.');

  return sendJson(res, 200, {
    ok: true,
    url: target.url,
    resourceUrl: target.resourceUrl,
    parameters: target.parameters,
  });
}

// Only ever attach something Shopify itself just handed back from
// stagedUploadsCreate, so this endpoint can't be pointed at an arbitrary URL.
//
// Matched on the parsed hostname, not with a regex on the whole string. The
// first version required the host to be exactly storage.googleapis.com, and
// Shopify actually stages images on shopify-staged-uploads.storage.googleapis.com
// -- a subdomain -- so every real upload was rejected at the final step after
// the bytes had already transferred.
const UPLOAD_HOST_SUFFIXES = [
  'storage.googleapis.com',
  'shopifycloud.com',
  'shopify.com',
];

function isShopifyUploadUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();
  // Suffix match must be on a dot boundary, or "evilstorage.googleapis.com"
  // and "notshopify.com" would both pass.
  return UPLOAD_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

async function handleAttach(res, body, piece, adoption) {
  const resourceUrl = String(body.resourceUrl || '');
  if (!isShopifyUploadUrl(resourceUrl)) {
    return sendJson(res, 400, { ok: false, error: 'That upload could not be verified.' });
  }

  const data = await shopifyGraphql(
    `mutation($product: ProductUpdateInput!, $media: [CreateMediaInput!]!) {
      productUpdate(product: $product, media: $media) {
        product { id }
        userErrors { field message }
      }
    }`,
    {
      product: { id: piece.id },
      media: [{
        alt: (adoption.adopter ? `${PENDING_PREFIX} ${adoption.adopter}` : PENDING_PREFIX).slice(0, 512),
        mediaContentType: 'IMAGE',
        originalSource: resourceUrl,
      }],
    },
  );

  const result = data && data.productUpdate;
  const errors = (result && result.userErrors) || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));

  return sendJson(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const params = url.searchParams;
  const adoption = await readAdoption(params);
  const isPost = req.method === 'POST';

  if (!adoption) {
    return isPost
      ? sendJson(res, 401, { ok: false, error: 'This upload link is not valid.' })
      : sendHtml(res, 404, errorPage('This upload link is expired or incomplete. Check that you copied all of it.'));
  }

  try {
    const piece = await fetchPiece(adoption.sku);
    if (!piece) {
      return isPost
        ? sendJson(res, 404, { ok: false, error: 'That creation could not be found.' })
        : sendHtml(res, 404, errorPage('We could not find the creation this link points to.'));
    }

    if (!isPost) return sendHtml(res, 200, uploadPage(piece, adoption, params.get('t')));

    // Re-checked on the write path, not just when rendering the page: the page
    // is only a suggestion, and the POST is what actually adds media.
    if (piece.ownerPhotoCount >= MAX_PHOTOS_PER_PIECE) {
      return sendJson(res, 429, { ok: false, error: 'This creation already has all the photos it can show.' });
    }

    const body = await readJsonBody(req);
    if (body.action === 'stage') return handleStage(res, body);
    if (body.action === 'attach') return handleAttach(res, body, piece, adoption);
    return sendJson(res, 400, { ok: false, error: 'Unknown action.' });
  } catch (error) {
    return isPost
      ? sendJson(res, 500, { ok: false, error: error.message })
      : sendHtml(res, 500, errorPage('Something went wrong loading this page. Please try again shortly.'));
  }
};
