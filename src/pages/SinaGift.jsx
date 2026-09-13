import React, { useMemo, useState } from 'react';
import { Layout } from './SinaPages.jsx';
import useCatalogProducts from '../hooks/useCatalogProducts.js';
import usePageMeta from '../hooks/usePageMeta.js';

const initialForm = {
  accessKey: '',
  sku: '',
  recipientName: '',
  notificationEmail: '',
  recipientEmail: '',
};

function available(product) {
  return product && product.status !== 'sold-out' && product.availableForSale !== false;
}

export default function SinaGift() {
  usePageMeta('Sina Gift | Sina\'s Creations', 'Create a complimentary Sina Gift adoption.');
  const { products, loading } = useCatalogProducts();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

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
              Sina Gift passcode
              <input type="password" value={form.accessKey} onChange={(event) => update('accessKey', event.target.value)} autoComplete="current-password" required />
            </label>
            <label className="full">
              Piece to gift
              <select value={form.sku} onChange={(event) => update('sku', event.target.value)} disabled={loading} required>
                <option value="">{loading ? 'Loading available pieces…' : 'Choose an available piece'}</option>
                {giftablePieces.map((piece) => (
                  <option key={piece.sku} value={piece.sku}>{piece.name || piece.sku}</option>
                ))}
              </select>
            </label>
            {selectedPiece && <p className="sina-gift-form__selection">Selected: <strong>{selectedPiece.name || selectedPiece.sku}</strong> ({selectedPiece.sku})</p>}
            <label>
              Certificate recipient name
              <input value={form.recipientName} onChange={(event) => update('recipientName', event.target.value)} placeholder="Jayme Arnold" required />
            </label>
            <label>
              Internal notification email <em>(optional)</em>
              <input type="email" value={form.notificationEmail} onChange={(event) => update('notificationEmail', event.target.value)} placeholder="Use only when staff should receive the Shopify order email" />
            </label>
            <label className="full">
              Recipient email
              <input type="email" value={form.recipientEmail} onChange={(event) => update('recipientEmail', event.target.value)} placeholder="Creates or updates their ARMS contact" required />
            </label>
            <p className="sina-gift-form__note full">The recipient email creates or updates their ARMS contact. Internal notification email is only for Sina&apos;s copy of the Shopify order; it never controls the certificate name or recipient contact.</p>
            {error && <p className="sina-gift-form__message sina-gift-form__message--error full" role="alert">{error}</p>}
            {result && (
              <div className="sina-gift-form__message sina-gift-form__message--success full" role="status">
                <strong>{result.orderName} is now a complimentary Sina Gift.</strong>
                <span>{result.pieceTitle} is reserved for {result.recipientName}. Their ARMS contact is created, and the order is marked paid and ready to fulfill.</span>
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
