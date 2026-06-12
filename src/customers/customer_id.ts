import { z } from 'zod';

/**
 * Client-generated demo identity (no auth — see README). Constrained to a safe
 * charset so it can travel in paths, queries and SQL params without surprises.
 */
export const customerIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
