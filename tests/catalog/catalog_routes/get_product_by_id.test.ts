import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { AppFactory } from '../../../src/core/app_factory.js';
import { Config } from '../../../src/core/config.js';

describe('CatalogRoutes GET /products/:id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
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

  it('serves the product', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/5' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 5,
      name: 'Azul',
      brand: 'Plan B Games',
      players: [2, 3, 4],
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
