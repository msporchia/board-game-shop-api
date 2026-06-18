import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { CatalogStore } from './catalog_store.js';
import type { Product } from './product.js';

const seedProductSchema = z.object({
  id_product: z.number().int(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  autori: z.string(),
  players: z.array(z.number().int()),
  players_display: z.string(),
  duration_min: z.number(),
  age_min: z.number(),
  complexity: z.string(),
  complexity_level: z.number().int(),
  year: z.number().int(),
  internal_rating: z.number(),
  is_expansion: z.boolean(),
  categoria: z.string(),
  marca: z.string(),
  image: z.string(),
});

const seedSchema = z.array(seedProductSchema);

/**
 * The snapshot carries no price — pricing is this service's domain (see
 * docs/phase-2.md). Deterministic demo rule derived from the game's own
 * fields, so reseeding always reproduces the same catalog.
 */
function demoPriceCents(raw: z.infer<typeof seedProductSchema>): number {
  return 1500 + raw.complexity_level * 700 + raw.duration_min * 10;
}

function toProduct(raw: z.infer<typeof seedProductSchema>): Product {
  return {
    id: raw.id_product,
    name: raw.name,
    description: raw.description,
    tags: raw.tags,
    authors: raw.autori,
    players: raw.players,
    playersDisplay: raw.players_display,
    durationMin: raw.duration_min,
    ageMin: raw.age_min,
    complexity: raw.complexity,
    complexityLevel: raw.complexity_level,
    year: raw.year,
    rating: raw.internal_rating,
    isExpansion: raw.is_expansion,
    category: raw.categoria,
    brand: raw.marca,
    image: raw.image,
    priceCents: demoPriceCents(raw),
  };
}

/**
 * Seeds the catalog store from a JSON snapshot of the legacy (PrestaShop-shaped)
 * source — the same data feeding the AI service's pipeline. Owns that legacy wire
 * schema and its translation into the domain model, so nothing downstream sees
 * `id_product` or `marca`. The production-shaped flow is shop-created products plus
 * seller indexing/enrichment callbacks; this snapshot is the demo shortcut.
 */
export class CatalogSeeder {
  constructor(
    private readonly store: CatalogStore,
    private readonly seedPath: string,
  ) {}

  /** No-op when the store already has rows — re-seeding is wipe-and-boot. */
  seedIfEmpty(): { seeded: number } {
    if (this.store.count() > 0) {
      return { seeded: 0 };
    }
    const raw: unknown = JSON.parse(readFileSync(this.seedPath, 'utf-8'));
    const products = seedSchema.parse(raw).map(toProduct);
    this.store.insertMany(products);
    return { seeded: products.length };
  }
}
