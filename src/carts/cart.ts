import { z } from 'zod';
import { customerIdSchema } from '../customers/customer_id.js';

/**
 * Outbound cart model. All money is integer cents and server-computed — the
 * web client renders it, it never computes it.
 */

export const cartItemSchema = z.object({
  productId: z.number().int(),
  name: z.string(),
  image: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
  lineTotalCents: z.number().int(),
});

export const cartSchema = z.object({
  customerId: customerIdSchema,
  items: z.array(cartItemSchema),
  totalCents: z.number().int(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
