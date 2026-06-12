import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { AppFactory } from '../../../src/core/app_factory.js';
import { Config } from '../../../src/core/config.js';

describe('CatalogRoutes GET /products', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Real app over an in-memory store seeded from the checked-in fixture.
    app = await new AppFactory(
      Config.fromEnv({
        DB_PATH: ':memory:',
        CATALOG_SEED_PATH: 'tests/support/catalog_seed.fixture.json',
      }),
    ).create();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the seeded catalog in the domain shape', async () => {
    const response = await app.inject({ method: 'GET', url: '/products' });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      products: Record<string, unknown>[];
      page: number;
      pageSize: number;
      hasNext: boolean;
    }>();
    expect(body).toMatchObject({ page: 1, pageSize: 24, hasNext: false });
    expect(body.products.map((p) => p['name'])).toEqual(['Catan', 'Carcassonne', 'Azul']);
    expect(body.products[0]).toMatchObject({ id: 1, brand: 'KOSMOS', tags: expect.any(Array) });
    expect(body.products[0]).not.toHaveProperty('id_product');
  });

  it('honours explicit pagination and reports hasNext', async () => {
    const response = await app.inject({ method: 'GET', url: '/products?page=2&pageSize=1' });

    const body = response.json<{ products: { name: string }[]; hasNext: boolean }>();
    expect(body.products.map((p) => p.name)).toEqual(['Carcassonne']);
    expect(body).toMatchObject({ page: 2, pageSize: 1, hasNext: true });
  });

  it('rejects invalid pagination params with 400', async () => {
    for (const url of ['/products?page=0', '/products?pageSize=101', '/products?page=abc']) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode, url).toBe(400);
    }
  });

  it('documents the catalog routes in the OpenAPI spec', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<{
      paths: Record<string, unknown>;
    }>();

    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(['/products', '/products/{id}']),
    );
  });
});
