import { describe, expect, it } from 'vitest';
import { CatalogService } from '../../../src/catalog/catalog_service.js';
import { EnrichmentClient } from '../../../src/catalog/enrichment_client.js';
import { MockCatalogClient } from '../../../src/catalog/mock_catalog_client.js';
import { UpstreamError } from '../../../src/core/upstream_error.js';
import { upstreamPage, upstreamProduct } from '../../support/catalog_fixtures.js';
import { fakeFetch, jsonResponse } from '../../support/fake_fetch.js';

type Handler = (url: URL) => Response;

function buildService(handlers: { catalog: Handler; seller: Handler }): CatalogService {
  const fetchFn = fakeFetch((url) =>
    (url.hostname === 'catalog.test' ? handlers.catalog : handlers.seller)(url),
  );
  return new CatalogService(
    new MockCatalogClient('http://catalog.test:8001', fetchFn),
    new EnrichmentClient('http://seller.test:8000', fetchFn),
  );
}

const enrichmentBody = {
  description: 'Pipeline-enriched description.',
  citations: [{ source: 'boardgamegeek', url: 'https://bgg.example/2' }],
};

describe('CatalogService.getProduct', () => {
  it('composes the base product with the enrichment', async () => {
    const service = buildService({
      catalog: () => jsonResponse(upstreamPage([upstreamProduct({ id_product: 2 })])),
      seller: () => jsonResponse(enrichmentBody),
    });

    const detail = await service.getProduct(2);

    expect(detail).toMatchObject({ id: 2, name: 'Catan', enrichment: enrichmentBody });
  });

  it('scans past the first page when the id is further in', async () => {
    const service = buildService({
      catalog: (url) =>
        url.searchParams.get('page') === '1'
          ? jsonResponse(upstreamPage([upstreamProduct({ id_product: 1 })], { hasNext: true }))
          : jsonResponse(upstreamPage([upstreamProduct({ id_product: 101, name: 'Azul' })])),
      seller: () => jsonResponse(enrichmentBody, 404),
    });

    const detail = await service.getProduct(101);

    expect(detail).toMatchObject({ id: 101, name: 'Azul' });
  });

  it('returns null when the id is in no page', async () => {
    const service = buildService({
      catalog: () => jsonResponse(upstreamPage([upstreamProduct({ id_product: 1 })])),
      seller: () => jsonResponse(enrichmentBody),
    });

    await expect(service.getProduct(42)).resolves.toBeNull();
  });

  it('degrades to enrichment null when the AI service fails', async () => {
    const service = buildService({
      catalog: () => jsonResponse(upstreamPage([upstreamProduct({ id_product: 2 })])),
      seller: () => jsonResponse({ oops: true }, 500),
    });

    const detail = await service.getProduct(2);

    expect(detail).toMatchObject({ id: 2, enrichment: null });
  });

  it('propagates catalog failures instead of masking them', async () => {
    const service = buildService({
      catalog: () => jsonResponse({}, 503),
      seller: () => jsonResponse(enrichmentBody),
    });

    await expect(service.getProduct(2)).rejects.toThrow(UpstreamError);
  });
});
