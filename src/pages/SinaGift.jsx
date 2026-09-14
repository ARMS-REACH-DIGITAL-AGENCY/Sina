import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './SinaPages.jsx';
import useCatalogProducts from '../hooks/useCatalogProducts.js';
import usePageMeta from '../hooks/usePageMeta.js';

const initialForm = {
  accessKey: '',
  sku: '',
  recipientName: '',
  notificationEmail: 'thomasinascreations@gmail.com',
  recipientEmail: '',
  recipientPhone: '',
};

function available(product) {
  return product && product.status !== 'sold-out' && product.availableForSale !== false;
}

export default function SinaGift() {
  usePageMeta('Sina Gift | Sina\'s Creations', 'Create a complimentary Sina Gift adoption.');
  useEffect(() => {
    const manifest = document.querySelector('link[rel="manifest"]');
    const originalHref = manifest && manifest.getAttribute('href');
    if (manifest) manifest.setAttribute('href', '/sina-gift.webmanifest');
    return () => {
      if (manifest) manifest.setAttribute('href', originalHref || '/site.webmanifest');
    };
  }, []);
  const { products, loading } = useCatalogProducts();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [passcodeVisible, setPasscodeVisible] = useState(false);

  const giftablePieces = useMemo(() => products
    .filter(available)
    .sort((left, right) => String(left.name || left.sku || '').localeCompare(String(right.name || right.sku || ''))), [products]);

  const selectedPiece = giftablePieces.find((piece) => piece.sku === form.sku);

  function update(name, value) {
    setError('');
    setResult(null);
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!selectedPiece) {
      setError('Choose an available piece.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/sina-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': form.accessKey,
        },
        body: JSON.stringify({
          sku: form.sku,
          recipientName: form.recipientName,
          notificationEmail: form.notificationEmail,
          recipientEmail: form.recipientEmail,
          recipientPhone: form.recipientPhone,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The Sina Gift could not be created.');
      setResult(payload);
      setForm((current) => ({ ...initialForm, accessKey: current.accessKey }));
    } catch (requestError) {
      setError(requestError.message || 'The Sina Gift could not be created.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <main className="sina-gift-page">
        <section className="sina-gift-page__intro">
          <span>Sina&apos;s internal tool</span>
          <h1>Create Sina Gift</h1>
          <p>Creates a complimentary, paid Shopify order with no checkout or payment card. The recipient name is stored on the order and becomes the name on the adoption certificate.</p>
        </section>

        <section className="sina-gift-card" aria-label="Create a complimentary gift adoption">
          <form className="sina-gift-form" onSubmit={submit}>
            <label className="full">
              Passcode
              <span className="sina-gift-passcode-field">
                <input type={passcodeVisible ? 'text' : 'password'} value={form.accessKey} onChange={(event) => update('accessKey', event.target.value)} autoComplete="current-password" required />
                <button type="button" onClick={() => setPasscodeVisible((visible) => !visible)} aria-pressed={passcodeVisible}>
                  {passcodeVisible ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            <label className="full">
              Piece
              <select value={form.sku} onChange={(event) => update('sku', event.target.value)} disabled={loading} required>
                <option value="">{loading ? 'Loading available pieces…' : 'Choose an available piece'}</option>
                {giftablePieces.map((piece) => (
                  <option key={piece.sku} value={piece.sku}>{piece.name || piece.sku}</option>
                ))}
              </select>
            </label>
            {selectedPiece && <p className="sina-gift-form__selection">Selected: <strong>{selectedPiece.name || selectedPiece.sku}</strong> ({selectedPiece.sku})</p>}
            <label>
              Recipient name
              <input value={form.recipientName} onChange={(event) => update('recipientName', event.target.value)} required />
            </label>
            <label>
              Shopify / audit email
              <input type="email" value={form.notificationEmail} onChange={(event) => update('notificationEmail', event.target.value)} placeholder="Sina's order receipt" />
            </label>
            <label>
              Recipient email <em>(optional)</em>
              <input type="email" value={form.recipientEmail} onChange={(event) => update('recipientEmail', event.target.value)} placeholder="For certificate email" />
            </label>
            <label>
              Recipient phone <em>(optional)</em>
              <input type="tel" value={form.recipientPhone} onChange={(event) => update('recipientPhone', event.target.value)} placeholder="For contact matching" />
            </label>
            <p className="sina-gift-form__note full">ARMS adds the recipient when an email or phone is supplied. Without one, use the certificate link and add their contact details later.</p>
            {error && <p className="sina-gift-form__message sina-gift-form__message--error full" role="alert">{error}</p>}
            {result && (
              <div className="sina-gift-form__message sina-gift-form__message--success full" role="status">
                <strong>{result.orderName} is now a complimentary Sina Gift.</strong>
                <span>{result.pieceTitle} is reserved for {result.recipientName}. {result.armsContactPending ? 'No ARMS contact was added because no recipient email or phone was provided.' : 'Their ARMS contact is created.'} {result.recoveryEmailSent ? `A recovery copy with both links was emailed to ${result.notificationEmail}.` : 'The order is marked paid and ready to fulfill.'}</span>
                {result.recoveryEmailError && <span className="sina-gift-form__delivery-warning">Gift completed, but the recovery email was not sent: {result.recoveryEmailError}</span>}
                {result.certificateUrl && <a href={result.certificateUrl} target="_blank" rel="noreferrer">Open certificate</a>}
                {result.adminUrl && <a href={result.adminUrl} target="_blank" rel="noreferrer">Open order in Shopify</a>}
              </div>
            )}
            <button className="button primary sina-gift-form__submit full" type="submit" disabled={submitting || loading}>
              {submitting ? 'Creating Sina Gift…' : 'Create Complimentary Gift'}
            </button>
          </form>
        </section>
      </main>
    </Layout>
  );
}
