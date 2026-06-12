import type { Product } from '../../src/catalog/product.js';

/** Domain-shaped product builder for store-level tests. */
export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Catan',
    description: 'Gioco di gestione risorse e commercio.',
    tags: ['Gestione Risorse', 'Commercio'],
    authors: 'Klaus Teuber',
    players: [3, 4],
    playersDisplay: '3-4',
    durationMin: 75,
    ageMin: 10,
    complexity: 'Medio',
    complexityLevel: 2,
    year: 1995,
    rating: 7.0,
    isExpansion: false,
    category: 'Giochi da tavolo',
    brand: 'KOSMOS',
    image: 'https://img.gamenest.example/1.jpg',
    ...overrides,
  };
}
