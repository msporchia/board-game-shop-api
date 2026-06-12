import { z } from 'zod';

/** Body shape of every non-2xx response this service emits. */
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});
