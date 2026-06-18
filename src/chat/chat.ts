import { z } from 'zod';

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  choices: z.array(z.string()).default([]),
  k: z.number().int().min(1).max(10).default(4),
});

export const chatRecommendationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  image: z.string(),
  priceCents: z.number().int(),
  playersDisplay: z.string(),
  durationMin: z.number(),
  complexity: z.string(),
});

export const chatResponseSchema = z.object({
  message: z.string(),
  games: z.array(chatRecommendationSchema),
  quickReplies: z.array(z.string()),
});

const sellerChatGameByIdSchema = z.object({
  id: z.number().int(),
});

const sellerChatGameByProductIdSchema = z
  .object({
    id_product: z.number().int(),
  })
  .transform(({ id_product }) => ({ id: id_product }));

export const sellerChatGameSchema = z.union([
  sellerChatGameByIdSchema,
  sellerChatGameByProductIdSchema,
]);

export const sellerChatResponseSchema = z.object({
  message: z.string(),
  games: z.array(sellerChatGameSchema).default([]),
  quick_replies: z.array(z.string()).default([]),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type SellerChatResponse = z.infer<typeof sellerChatResponseSchema>;
