import { z } from 'zod';

/**
 * Outbound catalog model — this service's API contract, from which the web
 * client generates its types. Upstream legacy names (`id_product`, `marca`,
 * `categoria`, …) are translated at the client boundary and never leak here.
 */

export const enrichmentCitationSchema = z.object({
  source: z.string(),
  url: z.string().optional(),
});

export const enrichmentSchema = z.object({
  description: z.string(),
  citations: z.array(enrichmentCitationSchema),
});

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

/** Detail = base product + enrichment from the AI service (null when absent). */
export const productDetailSchema = productSchema.extend({
  enrichment: enrichmentSchema.nullable(),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductPage = z.infer<typeof productPageSchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
