// Certificate of Adoption -- the document itself.
//
// This module only builds HTML. Rendering it to PDF is api/certificate.js's
// job, and looking the piece up in Shopify is its caller's. Keeping the
// document pure means the layout can be previewed in a browser by writing the
// string to a file, with no Shopify credentials and no Chromium involved.
//
// Layout notes that are easy to undo by accident:
//  - The masthead is centred and everything from the piece name down shares one
//    left edge. That split is deliberate, not an oversight.
//  - `.body` centres itself in the space left between the masthead and the
//    provenance strip, so a short story and a long one both sit balanced
//    instead of stacking at the top and leaving a hole above the band.
//  - The photo carries a small top margin. Cormorant sits well below the top of
//    its line box at 62px, so aligning the boxes alone drops the photo visibly
//    below the piece name; the nudge puts its top edge on the cap height.

const QRCode = require('qrcode');
const { FONT_FACE_CSS, LOGO_DATA_URI } = require('./certificate-assets.js');

// Adopter names and piece copy come from Shopify and from whoever records the
// adoption, so everything interpolated below goes through here. A name with an
// ampersand is the common case; a name with a tag is the reason this exists.
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styles() {
  return `
${FONT_FACE_CSS}
@page { size: 8.5in 11in; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 8.5in; height: 11in; }
body {
  font-family: 'Cormorant Garamond', Georgia, serif;
  color: #292A28; background: #EEE9DE;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sheet { width: 8.5in; height: 11in; padding: 0.42in; display: flex; flex-direction: column; }
.frame {
  flex: 1; border: 1.5px solid #292A28; padding: 30px 52px 6px; overflow: hidden;
  display: flex; flex-direction: column; text-align: center;
  background: #F7F4EC; position: relative;
}
/* inner hairline -- the doubled rule reads as letterpress, not clip-art */
.frame::before {
  content: ''; position: absolute; inset: 5px;
  border: 0.75px solid rgba(217,161,91,.85); pointer-events: none;
}

.logo { width: 132px; align-self: center; margin-bottom: 14px; }
.eyebrow {
  font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600;
  letter-spacing: .28em; text-transform: uppercase; color: #C76A32;
}
.hr { border: 0; border-top: 0.75px solid rgba(41,42,40,.22); margin: 12px 64px 14px; }
.lede { font-style: italic; font-size: 14px; color: #626552; }
/* house style: 1-of-1 never breaks across lines, same rule as the site */
.nowrap { white-space: nowrap; }
.adopter { font-size: 31px; font-weight: 500; letter-spacing: .01em; margin: 3px 0 5px; line-height: 1.1; }

.body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.body-row { display: flex; gap: 28px; text-align: left; align-items: flex-start; }
.photo {
  width: 2.35in; height: 2.35in; flex: 0 0 2.35in;
  object-fit: cover; border: 0.75px solid rgba(41,42,40,.3);
  margin-top: 9px;
}
.photo--empty {
  display: flex; align-items: center; justify-content: center;
  background: #EEE9DE; color: rgba(41,42,40,.4);
  font-style: italic; font-size: 12px; text-align: center; line-height: 1.5;
}
/* min-width:0 stops a long unbroken word from widening the column and
   squeezing the photo out of its fixed basis */
.col { flex: 1; min-width: 0; }
.piece-name { font-size: 62px; font-weight: 600; line-height: .96; letter-spacing: -.015em; }
.tagline { font-style: italic; font-size: 18px; color: #5A4434; margin: 4px 0 15px; }
.col p { font-size: 15px; line-height: 1.64; }
.col .attest {
  margin-top: 11px; padding-top: 11px;
  border-top: 0.75px solid rgba(41,42,40,.16);
  font-size: 13px; line-height: 1.56; color: #5A4434;
}
.col .attest strong { font-weight: 600; color: #292A28; }

.sign { margin-top: 26px; }
.sign .name { font-style: italic; font-size: 27px; line-height: 1; }
.sign .signature-img { height: 52px; margin-bottom: 2px; }
.sign .rule { width: 232px; margin: 8px 0 7px; border-top: 0.75px solid rgba(41,42,40,.45); }
.sign .role {
  font-family: 'Inter', sans-serif; font-size: 7.5px; font-weight: 600;
  letter-spacing: .2em; text-transform: uppercase; color: #626552;
}

.facts {
  display: flex; margin-bottom: 16px;
  border-top: 0.75px solid rgba(41,42,40,.22);
  border-bottom: 0.75px solid rgba(41,42,40,.22);
}
.fact { flex: 1; padding: 13px 0 13px 18px; text-align: left; }
.fact:first-child { padding-left: 0; }
.fact + .fact { border-left: 0.75px solid rgba(41,42,40,.14); }
.fact dt {
  font-family: 'Inter', sans-serif; font-size: 7px; font-weight: 600;
  letter-spacing: .2em; text-transform: uppercase; color: #626552; margin-bottom: 5px;
}
.fact dd { font-size: 15px; }

.invite {
  margin: 0 -46px; padding: 18px 46px 19px;
  background: #292A28; color: #F7F4EC;
  display: flex; align-items: center; gap: 18px; text-align: left;
}
.invite h2 {
  font-family: 'Inter', sans-serif; font-size: 8.5px; font-weight: 600;
  letter-spacing: .24em; text-transform: uppercase; color: #D9A15B; margin-bottom: 6px;
}
.invite p { font-size: 14px; line-height: 1.5; color: rgba(247,244,236,.92); }
.invite .url {
  font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
  letter-spacing: .04em; color: #F7F4EC; margin-top: 7px;
}
.invite img { width: 62px; height: 62px; flex: 0 0 62px; background: #F7F4EC; padding: 4px; }
`;
}

/**
 * @param {object} piece
 * @param {string} piece.name          Piece name, e.g. "Peter"
 * @param {string} [piece.tagline]     Headline from the product description
 * @param {string} [piece.story]       Body paragraph from the product description
 * @param {string} piece.sku
 * @param {string} [piece.materials]
 * @param {string} piece.adopter       Who adopted it
 * @param {string} piece.adoptedOn     Already formatted for display
 * @param {string} piece.uploadUrl     Shown and encoded in the QR, no scheme
 * @param {string} [piece.photo]       data: URI or https URL; omitted renders a plate
 * @param {string} [piece.signature]   data: URI of a scanned signature
 * @returns {Promise<string>} complete HTML document
 */
async function buildCertificateHtml(piece) {
  const name = esc(piece.name);

  const qr = await QRCode.toDataURL(`https://${piece.uploadUrl}`, {
    margin: 0,
    width: 240,
    errorCorrectionLevel: 'M',
    color: { dark: '#292A28', light: '#F7F4EC' },
  });

  const photo = piece.photo
    ? `<img class="photo" src="${esc(piece.photo)}" alt="${name}">`
    : `<div class="photo photo--empty"><span>photograph of<br><em>${name}</em></span></div>`;

  // A scanned signature beats typeset italic on a document whose whole job is
  // to attest to something, so it wins whenever one is supplied.
  const signature = piece.signature
    ? `<img class="signature-img" src="${esc(piece.signature)}" alt="Thomasina Schnepf">`
    : `<div class="name">Thomasina Schnepf</div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Certificate of Adoption — ${name}</title>
<style>${styles()}</style></head>
<body><div class="sheet"><div class="frame">

  <img class="logo" src="${LOGO_DATA_URI}" alt="Sina's Creations">
  <div class="eyebrow">Certificate of Adoption</div>
  <hr class="hr">

  <div class="lede">This certifies that</div>
  <div class="adopter">${esc(piece.adopter)}</div>
  <div class="lede">has given a permanent home to the
    <span class="nowrap">1-of-1</span> Sina's Creation uniquely named</div>

  <div class="body">
    <div class="body-row">
      ${photo}
      <div class="col">
        <div class="piece-name">${name}</div>
        ${piece.tagline ? `<div class="tagline">${esc(piece.tagline)}</div>` : ''}
        ${piece.story ? `<p>${esc(piece.story)}</p>` : ''}
        <p class="attest">
          <strong>${name} is a <span class="nowrap">1-of-1</span> original.</strong>
          Every piece of glass was cut, layered and fired by hand. No two firings
          ever finish the same way &mdash; so there is no second ${name}, and
          there never will be.
        </p>
        <div class="sign">
          ${signature}
          <div class="rule"></div>
          <div class="role">Artist &middot; Sina's Creations</div>
        </div>
      </div>
    </div>
  </div>

  <dl class="facts">
    <div class="fact"><dt>Catalog Number</dt><dd>${esc(piece.sku)}</dd></div>
    <div class="fact"><dt>Materials</dt><dd>${esc(piece.materials || 'Fused glass')}</dd></div>
    <div class="fact"><dt>Adopted</dt><dd>${esc(piece.adoptedOn)}</dd></div>
  </dl>

  <div class="invite">
    <img src="${qr}" alt="">
    <div>
      <h2>${name}'s story continues with you</h2>
      <p>Send us a photo of ${name} in its new home and we'll add it to
         ${name}'s page &mdash; so the next person who finds it sees where it went.</p>
      <div class="url">${esc(piece.uploadUrl)}</div>
    </div>
  </div>

</div></div></body></html>
`;
}

module.exports = { buildCertificateHtml };
