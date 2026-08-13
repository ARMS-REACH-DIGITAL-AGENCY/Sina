// Single source of truth for product data on the live (lifted) site.
// Today this is a local array; the shape matches what a Shopify Storefront
// API response will provide, so swapping the source later (see
// src/hooks/useMosaicProducts.js) doesn't require touching any consumer.

export const collections = ['All', 'Pendants', 'Wire Wrapped', 'Necklaces', 'Ocean Necklaces', 'Plates', 'Wall Art', 'Charms', 'Sets'];

export const products = [
  { sku: 'LNY-36', name: 'Toby', category: 'Charms', price: 75, image: '/images/products/36.JPG', line: 'She turns the everyday into a little ceremony.', status: 'available' },
  { sku: 'NKL-166', name: 'Celeste Maxima', category: 'Necklaces', price: 225, image: '/images/products/166.JPG', line: 'She was too much for one panel.', status: 'available' },
  { sku: 'NKLO-82', name: 'Anne', category: 'Ocean Necklaces', price: 145, image: '/images/products/82.JPG', line: 'She leaps where the deep water sings.', status: 'available' },
  { sku: 'PLQ-FG-LG-45', name: 'Justina', category: 'Wall Art', price: 325, image: '/images/products/45.JPG', line: 'She holds a whole celebration in one frame.', status: 'available' },
  { sku: 'PLQ-FG-MD-67', name: 'Judith', category: 'Wall Art', price: 120, image: '/images/products/67.JPG', line: 'Four textures, one brilliant story.', status: 'available' },
  { sku: 'PLT-FG-31', name: 'Ashley', category: 'Plates', price: 95, image: '/images/products/31.JPG', line: 'Quiet smoke, soft light, steady grace.', status: 'available' },
  { sku: 'PND-MD-240', name: 'Renee', category: 'Pendants', price: 75, image: '/images/products/240.JPG', line: 'Desert stripes meet ocean shimmer.', status: 'available' },
  { sku: 'PND-SM-183', name: 'Jane', category: 'Pendants', price: 75, image: '/images/products/183.JPG', line: 'Bold as sunshine, sharp as style.', status: 'available' },
  { sku: 'PND-WW-MD-170', name: 'Greta', category: 'Wire Wrapped', price: 55, image: '/images/products/170.JPG', line: 'Cool water caught in silver.', status: 'available' },
  { sku: 'PND-WW-SM-65', name: 'Vicki', category: 'Wire Wrapped', price: 85, image: '/images/products/65.JPG', line: 'Silver frost meets a rainbow storm.', status: 'available' },
  { sku: 'SET-NKL-EAR-BRA-37', name: 'Farah', category: 'Sets', price: 185, image: '/images/products/37.JPG', line: 'Playful, polished, and a little bit mischief.', status: 'available' },
];
