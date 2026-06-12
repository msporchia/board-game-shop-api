import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { CatalogRoutes } from '../catalog/catalog_routes.js';
import { CatalogService } from '../catalog/catalog_service.js';
import { EnrichmentClient } from '../catalog/enrichment_client.js';
import { MockCatalogClient } from '../catalog/mock_catalog_client.js';
import { HealthRoutes } from '../health/health_routes.js';
import { Config } from './config.js';
import type { FetchFn } from './fetch_fn.js';
import { UpstreamError } from './upstream_error.js';

/**
 * Composition of the Fastify application.
 *
 * Wires the zod type provider (so route schemas drive both validation and the
 * emitted OpenAPI document), CORS, Swagger + Swagger UI, the app-level error
 * mapping (UpstreamError → 502), and the domain route classes. Holds no
 * request-handling logic itself. `fetchFn` is the network seam: tests inject a
 * fake and exercise the real wiring underneath.
 */
export class AppFactory {
  constructor(
    private readonly config: Config,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  /**
   * Async because the swagger plugin must be fully loaded (its onRoute hook
   * attached) before the routes are registered, or they would not land in the
   * emitted OpenAPI document.
   */
  async create(): Promise<FastifyInstance> {
    const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

    // zod schemas validate inbound requests and serialize responses.
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(cors, { origin: this.config.corsOrigin });

    await app.register(swagger, {
      openapi: {
        info: {
          title: 'board-game-shop-api',
          description:
            'Commerce backend and BFF for a board-game e-commerce demo. ' +
            'Owns products, orders and customers; proxies chat and search to the AI service.',
          version: '0.0.0',
        },
      },
      transform: jsonSchemaTransform,
    });

    await app.register(swaggerUi, { routePrefix: '/docs' });

    app.setErrorHandler((err, request, reply) => {
      if (err instanceof UpstreamError) {
        request.log.error({ err }, 'upstream failure');
        return reply.code(502).send({ error: 'bad_gateway', message: err.message });
      }
      return reply.send(err);
    });

    const catalogService = new CatalogService(
      new MockCatalogClient(this.config.mockCatalogUrl, this.fetchFn),
      new EnrichmentClient(this.config.sellerApiUrl, this.fetchFn),
    );

    new HealthRoutes().register(app);
    new CatalogRoutes(catalogService).register(app);

    return app;
  }
}
