import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../core/error_response.js';
import { customerIdSchema } from '../customers/customer_id.js';
import { cartSchema } from './cart.js';
import type { CartService } from './cart_service.js';

const cartParamsSchema = z.object({
  customerId: customerIdSchema,
});

const itemParamsSchema = cartParamsSchema.extend({
  productId: z.coerce.number().int().min(1),
});

const putItemBodySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

/**
 * /carts routes. Handlers validate (zod, via the route schemas) and delegate
 * to the cart service; every response is the full cart with server-computed
 * totals, so the web client never does money math.
 */
export class CartRoutes {
  constructor(private readonly service: CartService) {}

  register(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.get(
      '/carts/:customerId',
      {
        schema: {
          tags: ['carts'],
          summary: "A customer's cart (empty for a never-seen customer)",
          params: cartParamsSchema,
          response: { 200: cartSchema },
        },
      },
      (request) => this.service.getCart(request.params.customerId),
    );

    typed.put(
      '/carts/:customerId/items/:productId',
      {
        schema: {
          tags: ['carts'],
          summary: 'Set the quantity of a cart line (upsert)',
          params: itemParamsSchema,
          body: putItemBodySchema,
          response: { 200: cartSchema, 404: errorResponseSchema },
        },
      },
      async (request, reply) => {
        const cart = this.service.setItem(
          request.params.customerId,
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
      '/carts/:customerId/items/:productId',
      {
        schema: {
          tags: ['carts'],
          summary: 'Remove a cart line (idempotent)',
          params: itemParamsSchema,
          response: { 200: cartSchema },
        },
      },
      (request) => this.service.removeItem(request.params.customerId, request.params.productId),
    );
  }
}
