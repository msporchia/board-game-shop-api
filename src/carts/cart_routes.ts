import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../core/error_response.js';
import { customerHeadersSchema, customerIdFromHeaders } from '../customers/customer_headers.js';
import { cartSchema } from './cart.js';
import type { CartService } from './cart_service.js';

const itemParamsSchema = z.object({
  productId: z.coerce.number().int().min(1),
});

const putItemBodySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

/**
 * /cart routes. Handlers validate (zod, via the route schemas) and delegate
 * to the cart service; every response is the full cart with server-computed
 * totals, so the web client never does money math.
 */
export class CartRoutes {
  constructor(private readonly service: CartService) {}

  register(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.get(
      '/cart',
      {
        schema: {
          tags: ['carts'],
          summary: "The current customer's cart (empty for a never-seen customer)",
          headers: customerHeadersSchema,
          response: { 200: cartSchema },
        },
      },
      (request) => this.service.getCart(customerIdFromHeaders(request.headers)),
    );

    typed.put(
      '/cart/items/:productId',
      {
        schema: {
          tags: ['carts'],
          summary: 'Set the quantity of a cart line (upsert)',
          headers: customerHeadersSchema,
          params: itemParamsSchema,
          body: putItemBodySchema,
          response: { 200: cartSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        const customerId = customerIdFromHeaders(request.headers);
        const cart = this.service.setItem(
          customerId,
          request.params.productId,
          request.body.quantity,
        );
        if (!cart) {
          return reply.code(404).send({
            error: 'not_found',
            message: `product ${request.params.productId} not found`,
          });
        }
        return cart;
      },
    );

    typed.delete(
      '/cart/items/:productId',
      {
        schema: {
          tags: ['carts'],
          summary: 'Remove a cart line (idempotent)',
          headers: customerHeadersSchema,
          params: itemParamsSchema,
          response: { 200: cartSchema },
        },
      },
      (request) =>
        this.service.removeItem(customerIdFromHeaders(request.headers), request.params.productId),
    );
  }
}
