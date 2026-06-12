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
import { Config } from './config.js';
import { HealthRoutes } from '../health/health_routes.js';

/**
 * Composition of the Fastify application.
 *
 * Wires the zod type provider (so route schemas drive both validation and the
 * emitted OpenAPI document), CORS, Swagger + Swagger UI, and the domain route
 * classes. Holds no request-handling logic itself.
 */
export class AppFactory {
  constructor(private readonly config: Config) {}

  create(): FastifyInstance {
    const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

    // zod schemas validate inbound requests and serialize responses.
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.register(cors, { origin: this.config.corsOrigin });

    app.register(swagger, {
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

    app.register(swaggerUi, { routePrefix: '/docs' });

    new HealthRoutes().register(app);

    return app;
  }
}
