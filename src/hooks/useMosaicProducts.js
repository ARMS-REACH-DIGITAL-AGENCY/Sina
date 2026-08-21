import useCatalogProducts from './useCatalogProducts.js';

// SKUs to leave out of the Living Mosaic specifically -- still shown
// normally everywhere else on the site (shop grid, search, etc.).
const MOSAIC_EXCLUDED_SKUS = new Set([
  'PLQ-FG-LG-045', // Justina
]);

export default function useMosaicProducts() {
  const { products, loading } = useCatalogProducts();
  return { products: products.filter((product) => !MOSAIC_EXCLUDED_SKUS.has(product.sku)), loading };
}
