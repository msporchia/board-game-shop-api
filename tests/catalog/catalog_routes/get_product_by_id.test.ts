import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../support/build_app.js';

describe('CatalogRoutes GET /products/:id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the product', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/5' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 5,
      name: 'Azul',
      brand: 'Plan B Games',
      players: [2, 3, 4],
      priceCents: 2600,
    });
  });

  it('responds 404 with the error body for an unknown id', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/42' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_found', message: 'product 42 not found' });
  });

  it('rejects a non-numeric id with 400', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/abc' });

    expect(response.statusCode).toBe(400);
  });
});
