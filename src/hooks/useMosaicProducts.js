import { useEffect, useState } from 'react';
import { products as localProducts } from '../data/products.js';

// Returns the product catalog the mosaic maps itself onto.
//
// Today this resolves synchronously from the local data file. When the
// Shopify Storefront API is wired in, replace the body of the effect below
// with the live fetch — everything downstream (color matching, tiles,
// modal) already consumes `{ products, loading }` and expects the same
// shape: { sku, name, category, price, image, line, status }.
export default function useMosaicProducts() {
  const [state, setState] = useState({ products: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ products: [], loading: true });
    Promise.resolve(localProducts).then((products) => {
      if (!cancelled) setState({ products, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
