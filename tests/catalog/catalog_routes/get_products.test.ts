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

describe('CatalogRoutes GET /products', () => {
  it('serves the upstream page translated to the domain model', async () => {
    const app = await buildApp(
      fakeUpstreams({
        catalog: () =>
          jsonResponse(upstreamPage([upstreamProduct()], { page: 1, pageSize: 24, hasNext: true })),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/products' });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ products: { id: number; brand: string }[]; hasNext: boolean }>();
    expect(body.hasNext).toBe(true);
    expect(body.products[0]).toMatchObject({ id: 1, name: 'Catan', brand: 'KOSMOS' });
    expect(body.products[0]).not.toHaveProperty('id_product');
    await app.close();
  });

  it('applies page=1 pageSize=24 as defaults and forwards explicit values', async () => {
    const seen: URL[] = [];
    const app = await buildApp(
      fakeUpstreams({
        catalog: (url) => {
          seen.push(url);
          return jsonResponse(upstreamPage([]));
        },
      }),
    );

    await app.inject({ method: 'GET', url: '/products' });
    await app.inject({ method: 'GET', url: '/products?page=2&pageSize=50' });

    expect(seen[0]!.searchParams.get('page')).toBe('1');
    expect(seen[0]!.searchParams.get('pageSize')).toBe('24');
    expect(seen[1]!.searchParams.get('page')).toBe('2');
    expect(seen[1]!.searchParams.get('pageSize')).toBe('50');
    await app.close();
  });

  it('rejects invalid pagination params with 400', async () => {
    const app = await buildApp(fakeUpstreams({}));

    for (const url of ['/products?page=0', '/products?pageSize=101', '/products?page=abc']) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode, url).toBe(400);
    }
    await app.close();
  });

  it('maps a catalog upstream failure to 502 with the error body', async () => {
    const app = await buildApp(fakeUpstreams({}));

    const response = await app.inject({ method: 'GET', url: '/products' });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ error: 'bad_gateway' });
    await app.close();
  });

  it('documents the catalog routes in the OpenAPI spec', async () => {
    const app = await buildApp(fakeUpstreams({}));

    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<{
      paths: Record<string, unknown>;
    }>();

    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(['/products', '/products/{id}']),
    );
    await app.close();
  });
});
