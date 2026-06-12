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
import { CatalogSeeder } from '../catalog/catalog_seeder.js';
import { CatalogStore } from '../catalog/catalog_store.js';
import { HealthRoutes } from '../health/health_routes.js';
import { Config } from './config.js';

/**
 * Composition of the Fastify application.
 *
 * Wires the zod type provider (so route schemas drive both validation and the
 * emitted OpenAPI document), CORS, Swagger + Swagger UI, the owned stores
 * (opened here, seeded when empty, closed with the app), and the domain route
 * classes. Holds no request-handling logic itself.
 */
export class AppFactory {
  constructor(private readonly config: Config) {}

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

    const catalogStore = new CatalogStore(this.config.dbPath);
    app.addHook('onClose', () => {
      catalogStore.close();
    });
    const { seeded } = new CatalogSeeder(catalogStore, this.config.catalogSeedPath).seedIfEmpty();
    if (seeded > 0) {
      app.log.info({ seeded }, 'catalog seeded from snapshot');
    }

    new HealthRoutes().register(app);
    new CatalogRoutes(catalogStore).register(app);

    return app;
  }
}
