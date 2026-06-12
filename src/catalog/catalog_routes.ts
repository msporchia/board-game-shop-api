import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../core/error_response.js';
import type { CatalogService } from './catalog_service.js';
import { productDetailSchema, productPageSchema } from './product.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

const detailParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
});

/**
 * /products routes. Handlers validate (zod, via the route schemas) and
 * delegate to the catalog service; the response schemas drive both
 * serialization and the emitted OpenAPI document.
 */
export class CatalogRoutes {
  constructor(private readonly service: CatalogService) {}

  register(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.get(
      '/products',
      {
        schema: {
          tags: ['catalog'],
          summary: 'List products (paginated)',
          querystring: listQuerySchema,
          response: { 200: productPageSchema, 502: errorResponseSchema },
        },
      },
      (request) => this.service.listProducts(request.query.page, request.query.pageSize),
    );

    typed.get(
      '/products/:id',
      {
        schema: {
          tags: ['catalog'],
          summary: 'Product detail, composed with the AI-enriched description',
          params: detailParamsSchema,
          response: {
            200: productDetailSchema,
            404: errorResponseSchema,
            502: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const detail = await this.service.getProduct(request.params.id);
        if (!detail) {
          return reply
            .code(404)
            .send({ error: 'not_found', message: `product ${request.params.id} not found` });
        }
        return detail;
      },
    );
  }
}
