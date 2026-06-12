import { z } from 'zod';

/**
 * Outbound catalog model — this service's API contract, from which the web
 * client generates its types. The legacy source names (`id_product`, `marca`,
 * `categoria`, …) are translated at the seed boundary and never leak here.
 */

export const productSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  authors: z.string(),
  players: z.array(z.number().int()),
  playersDisplay: z.string(),
  durationMin: z.number(),
  ageMin: z.number(),
  complexity: z.string(),
  complexityLevel: z.number().int(),
  year: z.number().int(),
  rating: z.number(),
  isExpansion: z.boolean(),
  category: z.string(),
  brand: z.string(),
  image: z.string(),
});

export const productPageSchema = z.object({
  products: z.array(productSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductPage = z.infer<typeof productPageSchema>;
