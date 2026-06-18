import { z } from 'zod';

/**
 * Coerces a querystring field into an array of `item`. Fastify's parser yields a
 * bare value for a single occurrence (`?players=2`) and an array for repeats
 * (`?players=2&players=3`); both — and the absent case — normalize to an array.
 */
const queryList = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((value): unknown[] => {
    if (value === undefined) {
      return [];
    }
    return Array.isArray(value) ? (value as unknown[]) : [value];
  }, z.array(item));

/** `?flag=true` → `true`; anything else (including absent) → `false`. */
const queryFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');

/**
 * Browser-facing search params (camelCase). A deliberately thin facet surface;
 * the BFF maps these 1:1 to the seller's snake_case search contract. `soft`
 * marks a facet as a boost rather than a hard filter.
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1),
  k: z.coerce.number().int().min(1).max(20).default(5),
  players: queryList(z.coerce.number().int().min(1)),
  minDuration: z.coerce.number().int().min(0).optional(),
  maxDuration: z.coerce.number().int().min(0).optional(),
  minComplexity: z.coerce.number().int().min(1).max(5).optional(),
  maxComplexity: z.coerce.number().int().min(1).max(5).optional(),
  maxAge: z.coerce.number().int().min(0).optional(),
  minYear: z.coerce.number().int().optional(),
  maxYear: z.coerce.number().int().optional(),
  minRating: z.coerce.number().min(0).optional(),
  category: queryList(z.string().min(1)),
  brand: queryList(z.string().min(1)),
  excludeExpansions: queryFlag,
  soft: queryList(
    z.enum(['players', 'duration', 'complexity', 'age', 'year', 'rating', 'category', 'brand']),
  ),
});

/** A buyable search hit: the shop card enriched onto the seller's relevance score. */
export const searchResultSchema = z.object({
  score: z.number(),
  id: z.number().int(),
  name: z.string(),
  image: z.string(),
  priceCents: z.number().int(),
  playersDisplay: z.string(),
  durationMin: z.number(),
  complexity: z.string(),
});

export const searchResponseSchema = z.object({
  results: z.array(searchResultSchema),
});

/**
 * Seller response shape (`list[GameHit]`). Only the fields the BFF re-grounds
 * against its own catalog are kept; the rest are dropped. `id_product` is
 * normalized to the browser-facing `id`.
 */
const sellerGameHitSchema = z
  .object({
    score: z.number(),
    id_product: z.number().int(),
  })
  .transform(({ score, id_product }) => ({ score, id: id_product }));

export const sellerSearchResponseSchema = z.array(sellerGameHitSchema);

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
