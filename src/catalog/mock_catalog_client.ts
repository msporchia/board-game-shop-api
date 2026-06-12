import { z } from 'zod';
import type { FetchFn } from '../core/fetch_fn.js';
import { UpstreamError } from '../core/upstream_error.js';
import type { Product, ProductPage } from './product.js';

const UPSTREAM = 'mock-catalog';

const upstreamProductSchema = z.object({
  id_product: z.number().int(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  autori: z.string(),
  players: z.array(z.number().int()),
  players_display: z.string(),
  duration_min: z.number(),
  age_min: z.number(),
  complexity: z.string(),
  complexity_level: z.number().int(),
  year: z.number().int(),
  internal_rating: z.number(),
  is_expansion: z.boolean(),
  categoria: z.string(),
  marca: z.string(),
  image: z.string(),
});

const upstreamPageSchema = z.object({
  products: z.array(upstreamProductSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});

function toProduct(raw: z.infer<typeof upstreamProductSchema>): Product {
  return {
    id: raw.id_product,
    name: raw.name,
    description: raw.description,
    tags: raw.tags,
    authors: raw.autori,
    players: raw.players,
    playersDisplay: raw.players_display,
    durationMin: raw.duration_min,
    ageMin: raw.age_min,
    complexity: raw.complexity,
    complexityLevel: raw.complexity_level,
    year: raw.year,
    rating: raw.internal_rating,
    isExpansion: raw.is_expansion,
    category: raw.categoria,
    brand: raw.marca,
    image: raw.image,
  };
}

/**
 * HTTP client for the upstream mock catalog (plays the legacy PrestaShop-shaped
 * commerce platform). Owns that upstream's wire contract: parses every response
 * with zod and translates the legacy field names into this service's product
 * model, so nothing downstream sees `id_product` or `marca`.
 */
export class MockCatalogClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async listPage(page: number, pageSize: number): Promise<ProductPage> {
    const url = new URL('/index.php', this.baseUrl);
    url.search = new URLSearchParams({
      fc: 'module',
      module: 'utils',
      controller: 'seller',
      page: String(page),
      pageSize: String(pageSize),
    }).toString();

    let response: Response;
    try {
      response = await this.fetchFn(url);
    } catch (err) {
      throw new UpstreamError(UPSTREAM, `request failed: ${String(err)}`);
    }
    if (!response.ok) {
      throw new UpstreamError(UPSTREAM, `unexpected status ${response.status}`, response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw new UpstreamError(UPSTREAM, `invalid JSON body: ${String(err)}`);
    }
    const parsed = upstreamPageSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError(UPSTREAM, `payload failed parsing: ${parsed.error.message}`);
    }

    return {
      products: parsed.data.products.map(toProduct),
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      hasNext: parsed.data.hasNext,
    };
  }
}
