# Phase 1 — Catalog: implementation spec

Goal: serve the full catalog through this service. `GET /products` (paginated) and
`GET /products/{id}`, read from the shop's own catalog store. Conventions in
`CLAUDE.md` apply to every file.

> **Revised.** The original draft composed products live from the upstream mock
> catalog and an AI-service enriched-detail endpoint (see git history). Superseded:
> the seller is the AI engine only — it grows no shop-facing catalog endpoints. The
> shop owns its catalog data.

## 1. Data ownership and source

The catalog lives in the shop's SQLite database (`shop.db`, same file Phase 2 adds
orders to), in a `products` table. It is seeded at boot, when empty, from
`data/sample-catalog.json` — a checked-in snapshot (legacy PrestaShop-shaped
records) of the same source that feeds the AI service's enrichment pipeline.

Production-shaped flow, documented in the README: this service creates and owns the
commerce product, then asks seller to index/enrich it; seller can call back with
cleaned/enriched fields without becoming the commerce source of truth. In the current
demo, the seed JSON is the only source and there is no product-write or
enrichment-callback API.

Driver: `node:sqlite` (`DatabaseSync`) — in the platform, zero native deps;
experimental in Node 22 but API-frozen enough for this demo, and swappable behind
the store class per the README's storage rationale.

## 2. This service's API

Legacy source names are translated at the seed boundary — nothing downstream sees
`id_product` or `marca`. Product model (camelCase): `id`, `name`, `description`,
`tags`, `authors`, `players`, `playersDisplay`, `durationMin`, `ageMin`,
`complexity`, `complexityLevel`, `year`, `rating`, `isExpansion`, `category`,
`brand`, `image`. (`content_hash` and `source_descriptions` are pipeline concerns —
dropped at seed time.)

- `GET /products?page&pageSize` — page ≥ 1 (default 1), 1 ≤ pageSize ≤ 100
  (default 24). → `200 { products, page, pageSize, hasNext }`, ordered by `id`.
- `GET /products/{id}` — → `200` product, `404 { error, message }` for an unknown
  id.

Every non-2xx body is `{ error, message }`.

## 3. Source files

- `src/core/config.ts` — drops `mockCatalogUrl`; gains `dbPath` (default
  `./shop.db`, env `DB_PATH`, `:memory:` in tests) and `catalogSeedPath` (default
  `./data/sample-catalog.json`, env `CATALOG_SEED_PATH`). Keeps `sellerApiUrl` for
  the Phase 3 chat proxy.
- `src/core/error_response.ts` — `errorResponseSchema`, the shared non-2xx body.
- `src/catalog/product.ts` — zod schemas + types of the outbound catalog model:
  `productSchema`, `productPageSchema`.
- `src/catalog/catalog_store.ts` — `CatalogStore(dbPath)`: owns the SQLite handle
  and the `products` table (created on construction; arrays stored as JSON text).
  `count()`, `insertMany(products)`, `listPage(page, pageSize)`, `getById(id)`,
  `close()`.
- `src/catalog/catalog_seeder.ts` — `CatalogSeeder(store, seedPath)`:
  `seedIfEmpty()` reads the JSON snapshot, zod-parses the legacy records, translates
  them to the domain model, bulk-inserts. No-op when the store already has rows.
  Owns the legacy wire schema and the legacy→domain translation.
- `src/catalog/catalog_routes.ts` — `CatalogRoutes(store)`: the two routes above,
  zod schemas on querystring/params/responses so they land in the OpenAPI spec.
- `src/core/app_factory.ts` — wires store → seeder (run at create) → routes, closes
  the store on app close. The Phase-1-draft HTTP-client machinery (`FetchFn`,
  `UpstreamError`, the 502 mapping) is deleted with its clients; Phase 3 re-adds
  what the chat proxy needs.

## 4. Tests

The store runs on `:memory:`; the seeder reads a small checked-in fixture. Route
tests build the real app via `AppFactory` + a `Config` pointing at both.

- `tests/support/catalog_seed.fixture.json` — three legacy-shaped games.
- `tests/catalog/catalog_store/` — `listPage` (ordering, pagination, `hasNext`),
  `getById` (hit, miss), `insertMany`/`count` round-trip.
- `tests/catalog/catalog_seeder/seed_if_empty.test.ts` — seeds with legacy→domain
  mapping, no-op on a non-empty store, throws on a malformed snapshot.
- `tests/catalog/catalog_routes/get_products.test.ts` — 200 translated body,
  default and explicit pagination, invalid params → 400, catalog routes present in
  `/docs/json`.
- `tests/catalog/catalog_routes/get_product_by_id.test.ts` — 200, unknown id →
  404, non-numeric id → 400.

## 5. Housekeeping

- `data/sample-catalog.json` copied from the seller repo's mock fixture.
- `.env.example`, `docker-compose.yml`: drop `MOCK_CATALOG_URL`; document
  `DB_PATH`.
- README: architecture diagram and "products" bullet reflect catalog ownership;
  PLAN.md Phase 1 rewritten accordingly (stays 🔶 until the web slice is done).

## Verification checklist (all must pass)

1. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` green.
2. `npm run build`, then `node dist/main.js` on a fresh checkout state: first boot
   seeds `shop.db` from the snapshot; `curl localhost:3000/products` serves the
   full catalog; `/products/1` returns Catan; `/products/9999` → 404; a second
   boot does not duplicate rows.
3. `/docs/json` documents `/products` and `/products/{id}` with the zod-derived
   schemas.
