import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../support/build_app.js';

interface JsonSchema {
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

interface OpenApiOperation {
  parameters?: Array<{ in?: string; name?: string; required?: boolean }>;
  requestBody?: {
    content?: Record<string, { schema: JsonSchema }>;
  };
  responses?: Record<string, { content?: Record<string, { schema: JsonSchema }> }>;
}

interface OpenApiSpec {
  paths: Record<string, Record<string, OpenApiOperation>>;
}

describe('OpenAPI contract', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents the current browser-facing route surface', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<OpenApiSpec>();

    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/products',
        '/products/{id}',
        '/cart',
        '/cart/items/{productId}',
        '/orders',
        '/chat',
      ]),
    );
  });

  it('keeps customer_context out of the browser-facing chat request contract', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<OpenApiSpec>();
    const chatRequestSchema =
      spec.paths['/chat']?.['post']?.requestBody?.content?.['application/json']?.schema;

    expect(chatRequestSchema?.required).toEqual(expect.arrayContaining(['sessionId', 'message']));
    expect(chatRequestSchema?.properties).toEqual(
      expect.objectContaining({
        sessionId: expect.any(Object),
        message: expect.any(Object),
        choices: expect.any(Object),
        k: expect.any(Object),
      }),
    );
    expect(chatRequestSchema?.properties).not.toHaveProperty('customerId');
    expect(chatRequestSchema?.properties).not.toHaveProperty('customer_context');
    expect(chatRequestSchema?.properties).not.toHaveProperty('customerContext');
  });

  it('documents X-Customer-Id as the source of customer identity', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<OpenApiSpec>();
    const customerScopedOperations = [
      spec.paths['/cart']?.['get'],
      spec.paths['/cart/items/{productId}']?.['put'],
      spec.paths['/cart/items/{productId}']?.['delete'],
      spec.paths['/orders']?.['post'],
      spec.paths['/orders']?.['get'],
      spec.paths['/chat']?.['post'],
    ];

    for (const operation of customerScopedOperations) {
      expect(operation?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            in: 'header',
            name: 'x-customer-id',
            required: true,
          }),
        ]),
      );
    }
  });

  it('documents buyable chat recommendations and the 502 upstream failure response', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json<OpenApiSpec>();
    const chatResponses = spec.paths['/chat']?.['post']?.responses;
    const chatResponseSchema = chatResponses?.['200']?.content?.['application/json']?.schema;

    expect(chatResponses).toHaveProperty('502');
    expect(chatResponseSchema?.properties).toEqual(
      expect.objectContaining({
        message: expect.any(Object),
        games: expect.any(Object),
        quickReplies: expect.any(Object),
      }),
    );
    expect(chatResponseSchema?.required).toEqual(
      expect.arrayContaining(['message', 'games', 'quickReplies']),
    );
  });
});
