import { z } from 'zod';
import { customerIdSchema } from '../customers/customer_id.js';

/**
 * Outbound order model. An order is a snapshot: names and prices are copied
 * from the catalog at checkout time, so later catalog changes never rewrite
 * history. `createdAt` is ISO-8601 UTC — the advisor later uses real recency.
 */

export const orderItemSchema = z.object({
  productId: z.number().int(),
  name: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
  lineTotalCents: z.number().int(),
});

export const orderSchema = z.object({
  id: z.number().int(),
  customerId: customerIdSchema,
  createdAt: z.string(),
  totalCents: z.number().int(),
  items: z.array(orderItemSchema),
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
