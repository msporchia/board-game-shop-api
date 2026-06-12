import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  host: z.string().min(1).default('0.0.0.0'),
  corsOrigin: z.string().min(1).default('http://localhost:5173'),
  sellerApiUrl: z.string().url().default('http://seller-api:8000'),
  mockCatalogUrl: z.string().url().default('http://mock-prestashop:8001'),
});

/**
 * Typed, validated runtime configuration.
 *
 * Built once at the composition root from `process.env`. All defaults live here
 * so the service starts standalone without an `.env` file.
 */
export class Config {
  readonly port: number;
  readonly host: string;
  readonly corsOrigin: string;
  readonly sellerApiUrl: string;
  readonly mockCatalogUrl: string;

  private constructor(values: z.infer<typeof configSchema>) {
    this.port = values.port;
    this.host = values.host;
    this.corsOrigin = values.corsOrigin;
    this.sellerApiUrl = values.sellerApiUrl;
    this.mockCatalogUrl = values.mockCatalogUrl;
  }

  static fromEnv(env: NodeJS.ProcessEnv): Config {
    const values = configSchema.parse({
      port: env.PORT,
      host: env.HOST,
      corsOrigin: env.CORS_ORIGIN,
      sellerApiUrl: env.SELLER_API_URL,
      mockCatalogUrl: env.MOCK_CATALOG_URL,
    });
    return new Config(values);
  }
}
