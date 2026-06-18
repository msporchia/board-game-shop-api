import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../support/build_app.js';

const headers = (customerId: string) => ({ 'x-customer-id': customerId });

describe('CartRoutes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET returns an empty cart for a never-seen customer', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: headers('ghost'),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ customerId: 'ghost', items: [], totalCents: 0 });
  });

  it('PUT upserts a line and returns the cart with server-computed totals', async () => {
    const first = await app.inject({
      method: 'PUT',
      url: '/cart/items/1',
      headers: headers('alice'),
      payload: { quantity: 2 },
    });
    expect(first.statusCode).toBe(200);
    // Catan is seeded at 36.50 € by the deterministic demo pricing rule.
    expect(first.json()).toMatchObject({
      customerId: 'alice',
      totalCents: 7300,
      items: [
        {
          productId: 1,
          name: 'Catan',
          unitPriceCents: 3650,
          quantity: 2,
          lineTotalCents: 7300,
        },
      ],
    });

    const second = await app.inject({
      method: 'PUT',
      url: '/cart/items/1',
      headers: headers('alice'),
      payload: { quantity: 1 },
    });
    expect(second.json()).toMatchObject({ totalCents: 3650 });
  });

  it('PUT responds 404 for a product not in the catalog', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/cart/items/999',
      headers: headers('alice'),
      payload: { quantity: 1 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_found', message: 'product 999 not found' });
  });

  it('DELETE removes the line and is idempotent', async () => {
    await app.inject({
      method: 'PUT',
      url: '/cart/items/2',
      headers: headers('bob'),
      payload: { quantity: 1 },
    });

    const removed = await app.inject({
      method: 'DELETE',
      url: '/cart/items/2',
      headers: headers('bob'),
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toEqual({ customerId: 'bob', items: [], totalCents: 0 });

    const again = await app.inject({
      method: 'DELETE',
      url: '/cart/items/2',
      headers: headers('bob'),
    });
    expect(again.statusCode).toBe(200);
  });

  it('rejects invalid quantity and customer header with 400', async () => {
    for (const payload of [{ quantity: 0 }, { quantity: 100 }, { quantity: 1.5 }, {}]) {
      const response = await app.inject({
        method: 'PUT',
        url: '/cart/items/1',
        headers: headers('alice'),
        payload,
      });
      expect(response.statusCode, JSON.stringify(payload)).toBe(400);
    }

    const badCustomer = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: headers('bad id!'),
    });
    expect(badCustomer.statusCode).toBe(400);

    const missingCustomer = await app.inject({ method: 'GET', url: '/cart' });
    expect(missingCustomer.statusCode).toBe(400);
  });
});
