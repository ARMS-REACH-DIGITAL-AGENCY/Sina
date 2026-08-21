import { useMemo } from 'react';
import useCatalogProducts from './useCatalogProducts.js';

// SKUs to leave out of the Living Mosaic specifically -- still shown
// normally everywhere else on the site (shop grid, search, etc.).
const MOSAIC_EXCLUDED_SKUS = new Set([
  'PLQ-FG-LG-045', // Justina
]);

export default function useMosaicProducts() {
  const { products, loading } = useCatalogProducts();

  // LivingMosaic rebuilds its whole grid (loading every product photo and
  // re-sampling colors) whenever this `products` array is a *new*
  // reference, not just when it has new content -- .filter() returns a
  // fresh array on every call, so without memoizing here, every re-render
  // (including the many fired during a zoom/pan gesture) was handing the
  // mosaic a "new" product list and restarting the build. In an actively
  // interacted-with mosaic, the build could get restarted before it ever
  // finished, leaving the grid stuck permanently in its loading (black)
  // state. Memoizing keeps the reference stable across renders unless the
  // underlying catalog data actually changes.
  const mosaicProducts = useMemo(
    () => products.filter((product) => !MOSAIC_EXCLUDED_SKUS.has(product.sku)),
    [products]
  );

  return { products: mosaicProducts, loading };
}
