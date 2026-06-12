import { describe, expect, it } from 'vitest';
import { EnrichmentClient } from '../../../src/catalog/enrichment_client.js';
import { UpstreamError } from '../../../src/core/upstream_error.js';
import { fakeFetch, jsonResponse } from '../../support/fake_fetch.js';

const BASE_URL = 'http://seller.test:8000';

describe('EnrichmentClient.getEnrichment', () => {
  it('fetches /detail/{id} and parses description and citations', async () => {
    const seen: URL[] = [];
    const client = new EnrichmentClient(
      BASE_URL,
      fakeFetch((url) => {
        seen.push(url);
        return jsonResponse({
          id_product: 7,
          description: 'Pipeline-enriched description.',
          citations: [{ source: 'boardgamegeek', url: 'https://bgg.example/7' }],
        });
      }),
    );

    const enrichment = await client.getEnrichment(7);

    expect(seen[0]!.pathname).toBe('/detail/7');
    expect(enrichment).toEqual({
      description: 'Pipeline-enriched description.',
      citations: [{ source: 'boardgamegeek', url: 'https://bgg.example/7' }],
    });
  });

  it('defaults citations to an empty list when the upstream omits them', async () => {
    const client = new EnrichmentClient(
      BASE_URL,
      fakeFetch(() => jsonResponse({ description: 'No sources.' })),
    );

    await expect(client.getEnrichment(1)).resolves.toEqual({
      description: 'No sources.',
      citations: [],
    });
  });

  it('returns null on 404 — the product simply has no enrichment', async () => {
    const client = new EnrichmentClient(
      BASE_URL,
      fakeFetch(() => jsonResponse({ detail: 'not found' }, 404)),
    );

    await expect(client.getEnrichment(999)).resolves.toBeNull();
  });

  it('throws UpstreamError on an unexpected status', async () => {
    const client = new EnrichmentClient(
      BASE_URL,
      fakeFetch(() => jsonResponse({ oops: true }, 500)),
    );

    await expect(client.getEnrichment(1)).rejects.toThrow(UpstreamError);
  });

  it('throws UpstreamError when the network request fails', async () => {
    const client = new EnrichmentClient(BASE_URL, () =>
      Promise.reject(new Error('connection refused')),
    );

    await expect(client.getEnrichment(1)).rejects.toThrow(UpstreamError);
  });

  it('throws UpstreamError when the payload fails parsing', async () => {
    const client = new EnrichmentClient(
      BASE_URL,
      fakeFetch(() => jsonResponse({ description: 42 })),
    );

    await expect(client.getEnrichment(1)).rejects.toThrow('payload failed parsing');
  });
});
