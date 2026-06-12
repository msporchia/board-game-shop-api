import { describe, expect, it } from 'vitest';
import { MockCatalogClient } from '../../../src/catalog/mock_catalog_client.js';
import { UpstreamError } from '../../../src/core/upstream_error.js';
import { upstreamPage, upstreamProduct } from '../../support/catalog_fixtures.js';
import { fakeFetch, jsonResponse } from '../../support/fake_fetch.js';

const BASE_URL = 'http://catalog.test:8001';

describe('MockCatalogClient.listPage', () => {
  it('requests the PrestaShop-shaped endpoint with the pagination params', async () => {
    const seen: URL[] = [];
    const client = new MockCatalogClient(
      BASE_URL,
      fakeFetch((url) => {
        seen.push(url);
        return jsonResponse(upstreamPage([], { page: 3, pageSize: 10 }));
      }),
    );

    await client.listPage(3, 10);

    expect(seen).toHaveLength(1);
    const url = seen[0]!;
    expect(url.pathname).toBe('/index.php');
    expect(url.searchParams.get('fc')).toBe('module');
    expect(url.searchParams.get('module')).toBe('utils');
    expect(url.searchParams.get('controller')).toBe('seller');
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('pageSize')).toBe('10');
  });

  it('translates legacy upstream field names into the domain product model', async () => {
    const client = new MockCatalogClient(
      BASE_URL,
      fakeFetch(() => jsonResponse(upstreamPage([upstreamProduct()], { hasNext: true }))),
    );

    const result = await client.listPage(1, 100);

    expect(result).toEqual({
      products: [
        {
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
        },
      ],
      page: 1,
      pageSize: 100,
      hasNext: true,
    });
  });

  it('throws UpstreamError on an unexpected status', async () => {
    const client = new MockCatalogClient(
      BASE_URL,
      fakeFetch(() => jsonResponse({ oops: true }, 500)),
    );

    await expect(client.listPage(1, 100)).rejects.toThrow(UpstreamError);
    await expect(client.listPage(1, 100)).rejects.toThrow('unexpected status 500');
  });

  it('throws UpstreamError when the network request fails', async () => {
    const client = new MockCatalogClient(BASE_URL, () =>
      Promise.reject(new Error('connection refused')),
    );

    await expect(client.listPage(1, 100)).rejects.toThrow(UpstreamError);
  });

  it('throws UpstreamError when the payload fails parsing', async () => {
    const client = new MockCatalogClient(
      BASE_URL,
      fakeFetch(() => jsonResponse({ products: [{ id_product: 'not-a-number' }] })),
    );

    await expect(client.listPage(1, 100)).rejects.toThrow(UpstreamError);
    await expect(client.listPage(1, 100)).rejects.toThrow('payload failed parsing');
  });
});
