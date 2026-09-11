#!/usr/bin/env node
/**
 * Regenerates lib/certificate-assets.js.
 *
 * The certificate is rendered by headless Chromium inside a serverless
 * function, which has no network access to Google Fonts and no reliable way to
 * read loose files out of node_modules -- Vercel's file tracer only bundles
 * what it can see statically, and fs reads of a font path are invisible to it.
 * So the fonts and the logo get inlined as data URIs in a generated module,
 * which the tracer follows like any other require.
 *
 * Run after changing the certificate's typefaces or the logo:
 *   node scripts/build-certificate-assets.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Only the weights the certificate actually sets. Cormorant 300 and the rest
// of the Inter range are deliberately absent -- every face added here lands in
// the deployed bundle whether the template uses it or not.
const FONTS = [
  ['cormorant', 400, 'normal', '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2'],
  ['cormorant', 500, 'normal', '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2'],
  ['cormorant', 600, 'normal', '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2'],
  ['cormorant', 400, 'italic', '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2'],
  ['inter', 400, 'normal', '@fontsource/inter/files/inter-latin-400-normal.woff2'],
  ['inter', 600, 'normal', '@fontsource/inter/files/inter-latin-600-normal.woff2'],
];

const FAMILY = { cormorant: 'Cormorant Garamond', inter: 'Inter' };

function dataUri(path, mime) {
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
}

const faces = FONTS.map(([key, weight, style, rel]) => {
  const uri = dataUri(join(root, 'node_modules', rel), 'font/woff2');
  return (
    `@font-face{font-family:'${FAMILY[key]}';font-style:${style};font-weight:${weight};` +
    `font-display:block;src:url(${uri}) format('woff2');}`
  );
}).join('');

const logo = dataUri(join(root, 'public/assets/brand/sinas-creations-black-logo.png'), 'image/png');

const out = `// GENERATED FILE -- do not edit by hand.
// Regenerate with: node scripts/build-certificate-assets.mjs
// Fonts: Cormorant Garamond + Inter (the two faces sinascreations.com loads).

const FONT_FACE_CSS = ${JSON.stringify(faces)};

const LOGO_DATA_URI = ${JSON.stringify(logo)};

module.exports = { FONT_FACE_CSS, LOGO_DATA_URI };
`;

const target = join(root, 'lib/certificate-assets.js');
writeFileSync(target, out);
console.log(`wrote ${target} (${(out.length / 1024).toFixed(0)} KB, ${FONTS.length} faces + logo)`);
