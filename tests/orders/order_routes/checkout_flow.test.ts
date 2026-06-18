import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../support/build_app.js';

const headers = (customerId: string) => ({ 'x-customer-id': customerId });

describe('OrderRoutes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST builds the order from the cart, clears it, and GET lists the history', async () => {
    await app.inject({
      method: 'PUT',
      url: '/cart/items/1',
      headers: headers('alice'),
      payload: { quantity: 2 },
    });
    await app.inject({
      method: 'PUT',
      url: '/cart/items/5',
      headers: headers('alice'),
      payload: { quantity: 1 },
    });

    const checkout = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: headers('alice'),
    });
    expect(checkout.statusCode).toBe(201);
    const order = checkout.json<{ id: number; createdAt: string; totalCents: number }>();
    // Catan 36.50 × 2 + Azul 26.00 (the deterministic seed prices).
    expect(order).toMatchObject({ customerId: 'alice', totalCents: 2 * 3650 + 2600 });
    expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const cart = await app.inject({ method: 'GET', url: '/cart', headers: headers('alice') });
    expect(cart.json()).toEqual({ customerId: 'alice', items: [], totalCents: 0 });

    const history = await app.inject({ method: 'GET', url: '/orders', headers: headers('alice') });
    expect(history.statusCode).toBe(200);
    expect(history.json()).toEqual({ orders: [order] });
  });

  it('POST responds 409 when the cart is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: headers('ghost'),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: 'empty_cart' });
  });

  it('validates the customer header on both routes', async () => {
    const badPost = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: headers('spaces are bad'),
    });
    expect(badPost.statusCode).toBe(400);

    const badGet = await app.inject({
      method: 'GET',
      url: '/orders',
      headers: headers('bad id'),
    });
    expect(badGet.statusCode).toBe(400);

    const missing = await app.inject({ method: 'GET', url: '/orders' });
    expect(missing.statusCode).toBe(400);
  });

  it('documents the cart and order routes in the OpenAPI spec', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<{
      paths: Record<string, unknown>;
    }>();

    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(['/cart', '/cart/items/{productId}', '/orders']),
    );
  });
});
