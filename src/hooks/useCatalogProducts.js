import { useEffect, useState } from 'react';
import { products as localProducts } from '../data/products.js';

const preferredCollectionOrder = [
  'Pendants',
  'Necklaces',
  'Lanyards',
  'Plates',
  'Plaques',
  'Charms',
  'Ornaments',
  'Sets',
];

const categoryAliases = {
  'Wire Wrapped': 'Pendants',
  'Ocean Necklaces': 'Necklaces',
  'Wall Art': 'Plaques',
};

function normalizeCategory(category = '') {
  return categoryAliases[category] || category;
}

function normalizeProduct(product) {
  return {
    ...product,
    category: normalizeCategory(product.category),
  };
}

function deriveCollections(products) {
  const discovered = [...new Set(products.map((product) => normalizeCategory(product.category)).filter(Boolean))];
  const ordered = preferredCollectionOrder.filter((name) => discovered.includes(name));
  const extras = discovered
    .filter((name) => !preferredCollectionOrder.includes(name))
    .sort((left, right) => left.localeCompare(right));

  return [...ordered, ...extras];
}

const normalizedLocalProducts = localProducts.map(normalizeProduct);
const fallbackCollections = deriveCollections(normalizedLocalProducts);

export default function useCatalogProducts() {
  // Don't seed the first paint with the bundled local snapshot -- its image
  // paths point at the old repo-hosted photos, which briefly flash on
  // screen before the live /api/catalog fetch (Shopify-hosted images)
  // replaces them a moment later. Starting empty means nothing renders
  // until either real data arrives or the fetch actually fails; the local
  // snapshot is still used, but only as the catch-block's last resort.
  const [state, setState] = useState({
    products: [],
    collections: [],
    loading: true,
    source: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch('/api/catalog');

        if (!response.ok) {
          throw new Error(`Catalog request failed with ${response.status}`);
        }

        const payload = await response.json();
        const remoteProducts = Array.isArray(payload.products) ? payload.products.map(normalizeProduct) : [];

        if (!remoteProducts.length) {
          throw new Error('Catalog response was empty.');
        }

        if (!cancelled) {
          setState({
            products: remoteProducts,
            collections: deriveCollections(remoteProducts),
            loading: false,
            source: payload.source || 'google-sheet',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            products: normalizedLocalProducts,
            collections: fallbackCollections,
            loading: false,
            source: 'fallback',
          });
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
