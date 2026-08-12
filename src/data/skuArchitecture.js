export const skuArchitecture = [
  { pattern: 'PND-SM-###', category: 'Pendants', definition: 'small pendant sold individually' },
  { pattern: 'PND-MD-###', category: 'Pendants', definition: 'medium pendant sold individually' },
  { pattern: 'PND-LG-###', category: 'Pendants', definition: 'large pendant sold individually' },
  { pattern: 'PND-WW-SM-###', category: 'Pendants', definition: 'small wire wrapped pendant sold individually' },
  { pattern: 'PND-WW-MD-###', category: 'Pendants', definition: 'medium wire wrapped pendant sold individually' },
  { pattern: 'PND-WW-LG-###', category: 'Pendants', definition: 'large wire wrapped pendant sold individually' },
  { pattern: 'NKL-###', category: 'Necklaces', definition: 'necklace sold individually' },
  { pattern: 'NKLO-###', category: 'Necklaces', definition: 'ocean style necklace sold individually' },
  { pattern: 'ORN-###', category: 'Ornaments', definition: 'ornament sold individually' },
  { pattern: 'ORN-WW-###', category: 'Ornaments', definition: 'wire wrapped ornament sold individually' },
  { pattern: 'LNY-###', category: 'Lanyards', definition: 'lanyard sold individually' },
  { pattern: 'PLQ-WW-SM-###', category: 'Plaques', definition: 'wire wrapped plaque sold individually - small' },
  { pattern: 'PLQ-WW-MD-###', category: 'Plaques', definition: 'wire wrapped plaque sold individually - medium' },
  { pattern: 'PLQ-WW-LG-###', category: 'Plaques', definition: 'wire wrapped plaque sold individually - large' },
  { pattern: 'PLQ-FG-SM-###', category: 'Plaques', definition: 'fused glass plaque sold individually - small' },
  { pattern: 'PLQ-FG-MD-###', category: 'Plaques', definition: 'fused glass plaque sold individually - medium' },
  { pattern: 'PLQ-FG-LG-###', category: 'Plaques', definition: 'fused glass plaque sold individually - large' },
  { pattern: 'PLT-FG-###', category: 'Plates', definition: 'fused glass plate sold individually' },
  { pattern: 'WA-AGA-WW-###', category: 'Wall Art', definition: 'wrapped wire sliced agate wall art' },
  { pattern: 'SET-NKL-EAR-###', category: 'Sets', definition: 'necklace sold with earrings as a set' },
  { pattern: 'SET-NKLO-EAR-###', category: 'Sets', definition: 'ocean style necklace sold with earrings as a set' },
  { pattern: 'SET-LNY-EAR-###', category: 'Sets', definition: 'lanyard sold with earrings as a set' },
];

export function shopifyHandleFromSku(sku) {
  return String(sku || '').trim().toLowerCase().replaceAll('/', '-');
}

export const catalogReadinessFields = [
  'Physical item confirmed',
  'SKU assigned',
  'Human name confirmed',
  'Price confirmed',
  'Image selected',
  'Image cleaned or marked usable',
  'Catalog row complete',
];
