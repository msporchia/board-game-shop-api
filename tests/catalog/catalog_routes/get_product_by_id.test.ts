import { describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { AppFactory } from '../../../src/core/app_factory.js';
import { Config } from '../../../src/core/config.js';
import type { FetchFn } from '../../../src/core/fetch_fn.js';
import { upstreamPage, upstreamProduct } from '../../support/catalog_fixtures.js';
import { fakeUpstreams, jsonResponse } from '../../support/fake_fetch.js';

async function buildApp(fetchFn: FetchFn): Promise<FastifyInstance> {
  const app = await new AppFactory(Config.fromEnv({}), fetchFn).create();
  await app.ready();
  return app;
}

const catalogWithCatan = () => jsonResponse(upstreamPage([upstreamProduct({ id_product: 1 })]));

describe('CatalogRoutes GET /products/:id', () => {
  it('serves the product composed with the enrichment', async () => {
    const app = await buildApp(
      fakeUpstreams({
        catalog: catalogWithCatan,
        seller: () =>
          jsonResponse({
            description: 'Pipeline-enriched description.',
            citations: [{ source: 'boardgamegeek', url: 'https://bgg.example/1' }],
          }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/products/1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 1,
      name: 'Catan',
      enrichment: {
        description: 'Pipeline-enriched description.',
        citations: [{ source: 'boardgamegeek', url: 'https://bgg.example/1' }],
      },
    });
    await app.close();
  });

  it('serves the product with enrichment null when the AI service is down', async () => {
    const app = await buildApp(fakeUpstreams({ catalog: catalogWithCatan }));

    const response = await app.inject({ method: 'GET', url: '/products/1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 1, enrichment: null });
    await app.close();
  });

  it('responds 404 with the error body for an unknown id', async () => {
    const app = await buildApp(fakeUpstreams({ catalog: catalogWithCatan }));

    const response = await app.inject({ method: 'GET', url: '/products/42' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_found', message: 'product 42 not found' });
    await app.close();
  });

  it('rejects a non-numeric id with 400', async () => {
    const app = await buildApp(fakeUpstreams({}));

    const response = await app.inject({ method: 'GET', url: '/products/abc' });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('maps a catalog upstream failure to 502', async () => {
    const app = await buildApp(fakeUpstreams({}));

    const response = await app.inject({ method: 'GET', url: '/products/1' });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: 'bad_gateway' });
    await app.close();
  });
});
