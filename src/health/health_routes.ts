import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('board-game-shop-api'),
});

/**
 * Liveness route. Declares its response schema via zod so the shape lands in
 * the emitted OpenAPI document. Has no upstream dependency: it stays green even
 * when the AI service or mock catalog are down.
 */
export class HealthRoutes {
  register(app: FastifyInstance): void {
    app.withTypeProvider<ZodTypeProvider>().get(
      '/health',
      {
        schema: {
          tags: ['health'],
          summary: 'Liveness probe',
          response: { 200: healthResponseSchema },
        },
      },
      () => ({ status: 'ok', service: 'board-game-shop-api' }) as const,
    );
  }
}
