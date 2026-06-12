import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../support/build_app.js';

describe('CatalogRoutes GET /products', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
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
    expect(body.products[0]).toMatchObject({ id: 1, brand: 'KOSMOS', priceCents: 3650 });
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
