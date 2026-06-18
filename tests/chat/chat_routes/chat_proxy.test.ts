import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../support/build_app.js';

const headers = (customerId: string) => ({ 'x-customer-id': customerId });

describe('ChatRoutes', () => {
  let app: FastifyInstance;
  const calls: Array<{ url: string; body: unknown }> = [];

  beforeAll(async () => {
    app = await buildApp({
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          body: JSON.parse(String(init?.body)),
        });
        return Response.json({
          message: 'Pandemic è una buona scelta cooperativa.',
          games: [{ id_product: 1 }, { id_product: 999 }],
          quick_replies: ['max 45 minuti', 'piu leggero'],
        });
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('proxies the turn to seller and returns shop-enriched buyable cards', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: headers('alice'),
      payload: {
        sessionId: 'session-1',
        message: 'Cerco un cooperativo per due',
        choices: ['max 45 minuti'],
        k: 4,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(calls).toEqual([
      {
        url: 'http://seller-api:8000/chat',
        body: {
          session_id: 'session-1',
          message: 'Cerco un cooperativo per due',
          choices: ['max 45 minuti'],
          k: 4,
          customer_context: {
            received_products: [],
            sent_products: [],
            cart_products: [],
          },
        },
      },
    ]);
    expect(response.json()).toEqual({
      message: 'Pandemic è una buona scelta cooperativa.',
      games: [
        {
          id: 1,
          name: 'Catan',
          image: 'https://img.gamenest.example/1.jpg',
          priceCents: 3650,
          playersDisplay: '3-4',
          durationMin: 75,
          complexity: 'Medio',
        },
      ],
      quickReplies: ['max 45 minuti', 'piu leggero'],
    });
  });

  it('builds customer_context from shop-owned state, not from the browser payload', async () => {
    const contextCalls: Array<{ body: Record<string, unknown> }> = [];
    const contextApp = await buildApp({
      fetch: async (_url, init) => {
        contextCalls.push({ body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        return Response.json({
          message: 'Visto che hai già Azul, evito di riproportelo.',
          games: [{ id_product: 1 }],
          quick_replies: [],
        });
      },
    });
    try {
      await contextApp.inject({
        method: 'PUT',
        url: '/cart/items/5',
        headers: headers('alice'),
        payload: { quantity: 2 },
      });
      const checkout = await contextApp.inject({
        method: 'POST',
        url: '/orders',
        headers: headers('alice'),
      });
      expect(checkout.statusCode).toBe(201);
      await contextApp.inject({
        method: 'PUT',
        url: '/cart/items/1',
        headers: headers('alice'),
        payload: { quantity: 1 },
      });

      const response = await contextApp.inject({
        method: 'POST',
        url: '/chat',
        headers: headers('alice'),
        payload: {
          sessionId: 'session-1',
          message: 'Cosa mi consigli ora?',
          customer_context: {
            received_products: [999],
            sent_products: [999],
            cart_products: [999],
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(contextCalls).toEqual([
        {
          body: {
            session_id: 'session-1',
            message: 'Cosa mi consigli ora?',
            choices: [],
            k: 4,
            customer_context: {
              received_products: [5],
              sent_products: [],
              cart_products: [1],
            },
          },
        },
      ]);
    } finally {
      await contextApp.close();
    }
  });

  it('responds 502 when the seller returns a non-2xx response', async () => {
    const failingApp = await buildApp({
      fetch: async () => Response.json({ error: 'down' }, { status: 503 }),
    });
    try {
      const response = await failingApp.inject({
        method: 'POST',
        url: '/chat',
        headers: headers('alice'),
        payload: {
          sessionId: 'session-1',
          message: 'Cerco un cooperativo per due',
        },
      });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        error: 'seller_unavailable',
        message: 'the AI seller did not return a usable chat response',
      });
    } finally {
      await failingApp.close();
    }
  });

  it('requires the customer identity header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        sessionId: 'session-1',
        message: 'Cerco un cooperativo per due',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('responds 502 when the seller response does not match the expected contract', async () => {
    const malformedApp = await buildApp({
      fetch: async () =>
        Response.json({
          message: 'Missing game ids',
          games: [{ name: 'Pandemic' }],
          quick_replies: ['max 45 minuti'],
        }),
    });
    try {
      const response = await malformedApp.inject({
        method: 'POST',
        url: '/chat',
        headers: headers('alice'),
        payload: {
          sessionId: 'session-1',
          message: 'Cerco un cooperativo per due',
        },
      });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        error: 'seller_unavailable',
        message: 'the AI seller did not return a usable chat response',
      });
    } finally {
      await malformedApp.close();
    }
  });
});
