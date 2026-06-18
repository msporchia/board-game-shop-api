import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorResponseSchema } from '../core/error_response.js';
import { customerHeadersSchema, customerIdFromHeaders } from '../customers/customer_headers.js';
import { orderSchema } from './order.js';
import type { OrderService } from './order_service.js';

const orderListSchema = z.object({
  orders: z.array(orderSchema),
});

/**
 * /orders routes. Handlers validate (zod, via the route schemas) and delegate
 * to the order service.
 */
export class OrderRoutes {
  constructor(private readonly service: OrderService) {}

  register(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.post(
      '/orders',
      {
        schema: {
          tags: ['orders'],
          summary: "Checkout: build an order from the customer's cart and clear it",
          headers: customerHeadersSchema,
          response: { 201: orderSchema, 409: errorResponseSchema },
        },
      },
      async (request, reply) => {
        const order = this.service.checkout(customerIdFromHeaders(request.headers));
        if (!order) {
          return reply
            .code(409)
            .send({ error: 'empty_cart', message: 'the cart is empty — nothing to order' });
        }
        return reply.code(201).send(order);
      },
    );

    typed.get(
      '/orders',
      {
        schema: {
          tags: ['orders'],
          summary: "A customer's order history, newest first",
          headers: customerHeadersSchema,
          response: { 200: orderListSchema },
        },
      },
      (request) => ({ orders: this.service.history(customerIdFromHeaders(request.headers)) }),
    );
  }
}
