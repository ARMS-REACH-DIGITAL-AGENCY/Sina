import useCatalogProducts from './useCatalogProducts.js';

export default function useMosaicProducts() {
  const { products, loading } = useCatalogProducts();
  return { products, loading };
}
