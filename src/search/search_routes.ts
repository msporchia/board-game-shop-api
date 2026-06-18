import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '../core/error_response.js';
import { searchQuerySchema, searchResponseSchema } from './search.js';
import type { SearchService } from './search_service.js';

/**
 * /search route. The browser-facing seam over the seller's faceted search: the
 * web never calls the Python service directly. Handler validates (zod) and
 * delegates; upstream failures map to the browser-facing `502` via the central
 * error handler. Not customer-scoped — search is catalog discovery, so it needs
 * no `X-Customer-Id`.
 */
export class SearchRoutes {
  constructor(private readonly service: SearchService) {}

  register(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.get(
      '/search',
      {
        schema: {
          tags: ['search'],
          summary: 'Faceted product search, enriched with shop-owned buyable cards',
          querystring: searchQuerySchema,
          response: { 200: searchResponseSchema, 502: errorResponseSchema },
        },
      },
      (request) => this.service.search(request.query),
    );
  }
}
