// Signed adoption tokens.
//
// The certificate link goes out in an email to whoever adopted the piece, so it
// cannot carry the admin key. Instead each link carries a token that names one
// specific adoption and is signed with a server-side secret: it proves "this
// SKU, adopted by this person, on this date" without granting anything else.
//
// The payload is signed, not encrypted -- anyone holding a link can read what's
// in it. That is fine, because everything in it is already printed on the
// certificate the link returns. What the signature prevents is someone editing
// a SKU in the URL and minting a certificate for a piece they never adopted.

const { createHmac, timingSafeEqual } = require('node:crypto');

// Tokens are handed to real people and end up pasted into browsers, so they
// use URL-safe base64 with the padding stripped.
function b64url(buffer) {
  return Buffer.from(buffer).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value) {
  const padded = String(value).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}

function secret() {
  const value = process.env.ADOPTION_TOKEN_SECRET;
  if (!value) throw new Error('ADOPTION_TOKEN_SECRET is not set');
  return value;
}

function sign(payloadB64) {
  return b64url(createHmac('sha256', secret()).update(payloadB64).digest());
}

/**
 * @param {object} adoption
 * @param {string} adoption.sku
 * @param {string} adoption.adopter
 * @param {string} [adoption.adoptedOn] ISO date; defaults to today
 * @returns {string} token safe to put in a URL
 */
function signAdoption({ sku, adopter, adoptedOn }) {
  const payload = {
    sku,
    adopter,
    adoptedOn: adoptedOn || new Date().toISOString().slice(0, 10),
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * @param {string} token
 * @returns {{sku: string, adopter: string, adoptedOn: string}|null} null if the
 *   token is malformed, unsigned, or signed with a different secret.
 */
function verifyAdoption(token) {
  const raw = String(token || '');
  const dot = raw.indexOf('.');
  if (dot < 1) return null;

  const payloadB64 = raw.slice(0, dot);
  const provided = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(payloadB64));

  // Compare in constant time, and only after a length check -- timingSafeEqual
  // throws rather than returning false when the lengths differ.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(payloadB64).toString('utf8'));
    if (!payload || !payload.sku || !payload.adopter) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

module.exports = { signAdoption, verifyAdoption };
