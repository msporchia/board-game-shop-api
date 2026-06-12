import { UpstreamError } from '../core/upstream_error.js';
import type { EnrichmentClient } from './enrichment_client.js';
import type { MockCatalogClient } from './mock_catalog_client.js';
import type { Enrichment, Product, ProductDetail, ProductPage } from './product.js';

/** The upstream list is the only lookup primitive — scan it in big pages. */
const SCAN_PAGE_SIZE = 100;

/**
 * Catalog use-cases behind the /products routes: paginated listing straight
 * from the mock catalog, and detail composition (base product + enriched
 * description from the AI service).
 *
 * Enrichment is decoration, not a dependency: when the AI service is down or
 * has no entry for the product, the detail degrades to `enrichment: null`
 * instead of failing — the catalog must keep working with the seller stack off.
 */
export class CatalogService {
  constructor(
    private readonly catalog: MockCatalogClient,
    private readonly enrichment: EnrichmentClient,
  ) {}

  listProducts(page: number, pageSize: number): Promise<ProductPage> {
    return this.catalog.listPage(page, pageSize);
  }

  async getProduct(id: number): Promise<ProductDetail | null> {
    const [product, enrichment] = await Promise.all([
      this.findInCatalog(id),
      this.fetchEnrichmentOrNull(id),
    ]);
    if (!product) {
      return null;
    }
    return { ...product, enrichment };
  }

  /** The upstream catalog has no single-product endpoint: page through the list. */
  private async findInCatalog(id: number): Promise<Product | null> {
    for (let page = 1; ; page++) {
      const result = await this.catalog.listPage(page, SCAN_PAGE_SIZE);
      const match = result.products.find((product) => product.id === id);
      if (match) {
        return match;
      }
      if (!result.hasNext) {
        return null;
      }
    }
  }

  private async fetchEnrichmentOrNull(id: number): Promise<Enrichment | null> {
    try {
      return await this.enrichment.getEnrichment(id);
    } catch (err) {
      if (err instanceof UpstreamError) {
        return null;
      }
      throw err;
    }
  }
}
