import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../support/build_app.js';

describe('SearchRoutes', () => {
  let app: FastifyInstance;
  const calls: string[] = [];

  beforeAll(async () => {
    app = await buildApp({
      fetch: async (url) => {
        calls.push(String(url));
        return Response.json([
          { score: 0.92, id_product: 1, name: 'Catan' },
          { score: 0.11, id_product: 999, name: 'Ghost' },
        ]);
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('proxies the query to seller and returns shop-enriched buyable cards', async () => {
    const response = await app.inject({ method: 'GET', url: '/search?q=cooperativo&k=5' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      results: [
        {
          score: 0.92,
          id: 1,
          name: 'Catan',
          image: 'https://img.gamenest.example/1.jpg',
          priceCents: 3650,
          playersDisplay: '3-4',
          durationMin: 75,
          complexity: 'Medio',
        },
      ],
    });
    expect(calls.at(-1)).toContain('http://seller-api:8000/search?');
  });

  it('maps browser-facing camelCase facets to the seller snake_case contract', async () => {
    const mappingCalls: string[] = [];
    const mappingApp = await buildApp({
      fetch: async (url) => {
        mappingCalls.push(String(url));
        return Response.json([]);
      },
    });
    try {
      await mappingApp.inject({
        method: 'GET',
        url:
          '/search?q=coop&k=3&players=2&players=3&minDuration=30&maxDuration=90' +
          '&minComplexity=2&maxComplexity=4&maxAge=12&minYear=2000&maxYear=2020' +
          '&minRating=7&category=Strategici&brand=KOSMOS&excludeExpansions=true' +
          '&soft=duration&soft=category',
      });

      const sent = new URL(mappingCalls[0] ?? '').searchParams;
      expect(sent.get('q')).toBe('coop');
      expect(sent.get('k')).toBe('3');
      expect(sent.getAll('players')).toEqual(['2', '3']);
      expect(sent.get('min_duration')).toBe('30');
      expect(sent.get('max_duration')).toBe('90');
      expect(sent.get('min_complexity')).toBe('2');
      expect(sent.get('max_complexity')).toBe('4');
      expect(sent.get('max_age')).toBe('12');
      expect(sent.get('min_year')).toBe('2000');
      expect(sent.get('max_year')).toBe('2020');
      expect(sent.get('min_rating')).toBe('7');
      expect(sent.getAll('categoria')).toEqual(['Strategici']);
      expect(sent.getAll('marca')).toEqual(['KOSMOS']);
      expect(sent.get('exclude_expansions')).toBe('true');
      expect(sent.getAll('soft')).toEqual(['duration', 'categoria']);
    } finally {
      await mappingApp.close();
    }
  });

  it('rejects a request without the required free-text query', async () => {
    const response = await app.inject({ method: 'GET', url: '/search?k=5' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'bad_request',
      message: expect.stringContaining('q'),
    });
  });

  it('responds 502 when the seller returns a non-2xx response', async () => {
    const failingApp = await buildApp({
      fetch: async () => Response.json({ error: 'down' }, { status: 503 }),
    });
    try {
      const response = await failingApp.inject({ method: 'GET', url: '/search?q=coop' });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        error: 'seller_unavailable',
        message: 'the AI seller did not return usable search results',
      });
    } finally {
      await failingApp.close();
    }
  });

  it('responds 502 when the seller response does not match the expected contract', async () => {
    const malformedApp = await buildApp({
      fetch: async () => Response.json([{ name: 'Catan' }]),
    });
    try {
      const response = await malformedApp.inject({ method: 'GET', url: '/search?q=coop' });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        error: 'seller_unavailable',
        message: 'the AI seller did not return usable search results',
      });
    } finally {
      await malformedApp.close();
    }
  });
});
