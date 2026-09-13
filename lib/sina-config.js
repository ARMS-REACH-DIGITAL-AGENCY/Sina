const { createHash, timingSafeEqual } = require('node:crypto');

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1yTKJUw-OjpI6V2wxUtfSVq61b3NV3g9EcaZxsUEbfBY/export?format=csv&gid=1901402257";
// Rotated 2026-09-11 at Pete's direction. The previous key's PLAINTEXT is still
// readable in this repo's git history (commit e59136d, api/photoroom-edit.js)
// from before it was replaced with a hash, and this repository is public -- so
// that key had to be treated as known to everyone. It guarded /api/shopify-sync,
// which deletes Shopify products with no matching Sheet row.
//
// Rotating does not scrub the old key from history; it makes it useless, which
// is the part that matters. Only the hash ever belongs in source.
const ADMIN_KEY_SHA256 = '9a5b9f16c829bd4264c04ddc391c8667202475090b932d29349b7cb4b489b093';
// A separate, high-entropy passcode limits the ability to create complimentary
// orders without sharing the stronger admin key used by destructive tools.
const SINA_GIFT_KEY_SHA256 = '2e9082d6bc0c13dfaa38e7705f4e58f25bc0cfd7ab38f4cc4a64edc7f41aac2d';

function hashMatches(value, expectedHash) {
  if (!value) return false;
  const actual = createHash('sha256').update(String(value)).digest();
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function isAdminKeyValid(value) {
  return hashMatches(value, ADMIN_KEY_SHA256);
}

function isSinaGiftKeyValid(value) {
  return hashMatches(value, SINA_GIFT_KEY_SHA256);
}

module.exports = { SHEET_CSV_URL, isAdminKeyValid, isSinaGiftKeyValid };
