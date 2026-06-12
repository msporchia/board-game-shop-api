import { describe, it, expect } from 'vitest';
import { Config } from '../../src/core/config.js';

describe('Config.fromEnv', () => {
  it('applies defaults when env vars are absent', () => {
    const config = Config.fromEnv({});

    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.sellerApiUrl).toBe('http://seller-api:8000');
    expect(config.mockCatalogUrl).toBe('http://mock-prestashop:8001');
  });

  it('reads overrides from env vars', () => {
    const config = Config.fromEnv({
      PORT: '8080',
      HOST: '127.0.0.1',
      CORS_ORIGIN: 'https://shop.example',
      SELLER_API_URL: 'http://localhost:8000',
      MOCK_CATALOG_URL: 'http://localhost:8001',
    });

    expect(config.port).toBe(8080);
    expect(config.host).toBe('127.0.0.1');
    expect(config.corsOrigin).toBe('https://shop.example');
    expect(config.sellerApiUrl).toBe('http://localhost:8000');
    expect(config.mockCatalogUrl).toBe('http://localhost:8001');
  });

  it('rejects an invalid port', () => {
    expect(() => Config.fromEnv({ PORT: 'not-a-number' })).toThrow();
    expect(() => Config.fromEnv({ PORT: '70000' })).toThrow();
  });
});
