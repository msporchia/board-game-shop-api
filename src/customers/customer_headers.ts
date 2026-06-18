import { z } from 'zod';
import { customerIdSchema } from './customer_id.js';

export const customerHeadersSchema = z
  .object({
    'x-customer-id': customerIdSchema,
  })
  .passthrough();

export type CustomerHeaders = z.infer<typeof customerHeadersSchema>;

export function customerIdFromHeaders(headers: CustomerHeaders): string {
  return headers['x-customer-id'];
}
