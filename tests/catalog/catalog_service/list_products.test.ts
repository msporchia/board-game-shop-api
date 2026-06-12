import { describe, expect, it } from 'vitest';
import { CatalogService } from '../../../src/catalog/catalog_service.js';
import { EnrichmentClient } from '../../../src/catalog/enrichment_client.js';
import { MockCatalogClient } from '../../../src/catalog/mock_catalog_client.js';
import { UpstreamError } from '../../../src/core/upstream_error.js';
import { upstreamPage, upstreamProduct } from '../../support/catalog_fixtures.js';
import { fakeFetch, jsonResponse } from '../../support/fake_fetch.js';

function buildService(catalogHandler: (url: URL) => Response): CatalogService {
  const fetchFn = fakeFetch(catalogHandler);
  return new CatalogService(
    new MockCatalogClient('http://catalog.test:8001', fetchFn),
    new EnrichmentClient('http://seller.test:8000', fetchFn),
  );
}

describe('CatalogService.listProducts', () => {
  it('forwards the requested page to the catalog and returns it translated', async () => {
    const seen: URL[] = [];
    const service = buildService((url) => {
      seen.push(url);
      return jsonResponse(
        upstreamPage([upstreamProduct({ id_product: 9, name: 'Azul' })], {
          page: 2,
          pageSize: 1,
          hasNext: true,
        }),
      );
    });

    const result = await service.listProducts(2, 1);

    expect(seen[0]!.searchParams.get('page')).toBe('2');
    expect(seen[0]!.searchParams.get('pageSize')).toBe('1');
    expect(result.products.map((product) => product.name)).toEqual(['Azul']);
    expect(result).toMatchObject({ page: 2, pageSize: 1, hasNext: true });
  });

  it('propagates catalog failures', async () => {
    const service = buildService(() => jsonResponse({}, 503));

    await expect(service.listProducts(1, 24)).rejects.toThrow(UpstreamError);
  });
});
