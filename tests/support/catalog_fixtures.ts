/** Raw product as served by the upstream mock catalog (PrestaShop-shaped). */
export interface UpstreamProduct {
  id_product: number;
  name: string;
  description: string;
  tags: string[];
  autori: string;
  players: number[];
  players_display: string;
  duration_min: number;
  age_min: number;
  complexity: string;
  complexity_level: number;
  year: number;
  internal_rating: number;
  is_expansion: boolean;
  categoria: string;
  marca: string;
  image: string;
}

export function upstreamProduct(overrides: Partial<UpstreamProduct> = {}): UpstreamProduct {
  return {
    id_product: 1,
    name: 'Catan',
    description: 'Gioco di gestione risorse e commercio.',
    tags: ['Gestione Risorse', 'Commercio'],
    autori: 'Klaus Teuber',
    players: [3, 4],
    players_display: '3-4',
    duration_min: 75,
    age_min: 10,
    complexity: 'Medio',
    complexity_level: 2,
    year: 1995,
    internal_rating: 7.0,
    is_expansion: false,
    categoria: 'Giochi da tavolo',
    marca: 'KOSMOS',
    image: 'https://img.gamenest.example/1.jpg',
    ...overrides,
  };
}

export function upstreamPage(
  products: UpstreamProduct[],
  overrides: Partial<{ page: number; pageSize: number; hasNext: boolean }> = {},
): Record<string, unknown> {
  return { products, page: 1, pageSize: 100, hasNext: false, ...overrides };
}
