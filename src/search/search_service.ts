import type { CatalogStore } from '../catalog/catalog_store.js';
import { UpstreamError } from '../core/upstream_error.js';
import {
  type SearchQuery,
  type SearchResponse,
  type SearchResult,
  sellerSearchResponseSchema,
} from './search.js';

/** Browser-facing body emitted for any seller-side search failure. */
const SELLER_UNUSABLE = 'the AI seller did not return usable search results';

/** Browser-facing facet name → the seller's `soft` constraint name. */
const SOFT_NAMES: Record<SearchQuery['soft'][number], string> = {
  players: 'players',
  duration: 'duration',
  complexity: 'complexity',
  age: 'age',
  year: 'year',
  rating: 'rating',
  category: 'categoria',
  brand: 'marca',
};

type Fetcher = typeof fetch;

/**
 * Browser-facing search adapter. The browser calls the shop BFF only; this
 * service maps the camelCase facets to the seller's snake_case `GET /search`
 * contract, validates the seller hits, and re-grounds each `id_product` against
 * the shop catalog so the web renders buyable cards with shop-owned prices.
 * Hits that are no longer in the catalog are dropped — relevance order is kept.
 */
export class SearchService {
  constructor(
    private readonly sellerApiUrl: string,
    private readonly catalog: CatalogStore,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const url = `${this.sellerApiUrl}/search?${this.toSellerParams(query).toString()}`;
    const response = await this.fetcher(url, { method: 'GET' });

    if (!response.ok) {
      throw new UpstreamError(SELLER_UNUSABLE, {
        cause: `seller search failed with ${response.status}`,
      });
    }

    let sellerPayload: unknown;
    try {
      sellerPayload = await response.json();
    } catch (cause) {
      throw new UpstreamError(SELLER_UNUSABLE, { cause });
    }

    const parsed = sellerSearchResponseSchema.safeParse(sellerPayload);
    if (!parsed.success) {
      throw new UpstreamError(SELLER_UNUSABLE, { cause: parsed.error });
    }

    const results: SearchResult[] = [];
    for (const hit of parsed.data) {
      const product = this.catalog.getById(hit.id);
      if (!product) {
        continue;
      }
      results.push({
        score: hit.score,
        id: product.id,
        name: product.name,
        image: product.image,
        priceCents: product.priceCents,
        playersDisplay: product.playersDisplay,
        durationMin: product.durationMin,
        complexity: product.complexity,
      });
    }

    return { results };
  }

  private toSellerParams(query: SearchQuery): URLSearchParams {
    const params = new URLSearchParams();
    params.set('q', query.q);
    params.set('k', String(query.k));
    for (const value of query.players) {
      params.append('players', String(value));
    }
    for (const value of query.category) {
      params.append('categoria', value);
    }
    for (const value of query.brand) {
      params.append('marca', value);
    }
    this.appendNumber(params, 'min_duration', query.minDuration);
    this.appendNumber(params, 'max_duration', query.maxDuration);
    this.appendNumber(params, 'min_complexity', query.minComplexity);
    this.appendNumber(params, 'max_complexity', query.maxComplexity);
    this.appendNumber(params, 'max_age', query.maxAge);
    this.appendNumber(params, 'min_year', query.minYear);
    this.appendNumber(params, 'max_year', query.maxYear);
    this.appendNumber(params, 'min_rating', query.minRating);
    if (query.excludeExpansions) {
      params.set('exclude_expansions', 'true');
    }
    for (const name of query.soft) {
      params.append('soft', SOFT_NAMES[name]);
    }
    return params;
  }

  private appendNumber(params: URLSearchParams, key: string, value: number | undefined): void {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
}
