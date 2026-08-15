import { useEffect, useState } from 'react';
import { products as localProducts } from '../data/products.js';

const preferredCollectionOrder = [
  'Pendants',
  'Wire Wrapped',
  'Necklaces',
  'Ocean Necklaces',
  'Lanyards',
  'Plates',
  'Wall Art',
  'Charms',
  'Sets',
];

function deriveCollections(products) {
  const discovered = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const ordered = preferredCollectionOrder.filter((name) => discovered.includes(name));
  const missingPreferred = preferredCollectionOrder.filter((name) => !ordered.includes(name));
  const extras = discovered.filter((name) => !preferredCollectionOrder.includes(name)).sort((left, right) => left.localeCompare(right));
  return [...ordered, ...missingPreferred, ...extras];
}

const fallbackCollections = deriveCollections(localProducts);

export default function useCatalogProducts() {
  const [state, setState] = useState({
    products: localProducts,
    collections: fallbackCollections,
    loading: true,
    source: 'fallback',
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
        const remoteProducts = Array.isArray(payload.products) ? payload.products : [];

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
            products: localProducts,
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
