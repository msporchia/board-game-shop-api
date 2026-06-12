import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Config } from '../../src/core/config.js';
import { AppFactory } from '../../src/core/app_factory.js';

describe('HealthRoutes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = new AppFactory(Config.fromEnv({})).create();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 200 with JSON content-type and the exact body shape', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.json()).toEqual({ status: 'ok', service: 'board-game-shop-api' });
  });
});
