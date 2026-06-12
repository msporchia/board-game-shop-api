# Phase 1 — Catalog: implementation spec

Goal: serve the full catalog through this BFF. `GET /products` reads the paginated
list from the upstream mock catalog; `GET /products/{id}` composes the base product
with the enriched description fetched from the AI service — the first real
service-to-service call. Conventions in `CLAUDE.md` apply to every file.

## 1. Upstream contracts

### Mock catalog (`MOCK_CATALOG_URL`, plays the legacy PrestaShop)

`GET /index.php?fc=module&module=utils&controller=seller&page=N&pageSize=M` →

```json
{
  "products": [
    {
      "id_product": 1,
      "name": "Catan",
      "content_hash": "…",
      "description": "…",
      "source_descriptions": [{ "source": "…", "description": "…" }],
      "tags": ["…"],
      "autori": "",
      "players": [3, 4],
      "players_display": "3-4",
      "duration_min": 75,
      "age_min": 10,
      "complexity": "Medio",
      "complexity_level": 2,
      "year": 1995,
      "internal_rating": 7.0,
      "is_expansion": false,
      "categoria": "Giochi da tavolo",
      "marca": "KOSMOS",
      "image": "https://…"
    }
  ],
  "page": 1,
  "pageSize": 100,
  "hasNext": false
}
```

There is **no single-product endpoint** upstream: detail lookups scan the paginated
list (pageSize 100) until the id shows up or `hasNext` is false.

### AI service enriched detail (`SELLER_API_URL`) — agreed contract

`GET /detail/{id_product}` → `200 { "id_product": 1, "description": "…",
"citations": [{ "source": "…", "url": "…" }] }`, `404` when the product has no
enrichment. **Not implemented seller-side yet** (tracked in that repo's plan); this
service codes against the contract and degrades gracefully meanwhile.

## 2. This service's API

Upstream legacy names are translated at the client boundary — nothing downstream
sees `id_product` or `marca`. Product model (camelCase): `id`, `name`,
`description`, `tags`, `authors`, `players`, `playersDisplay`, `durationMin`,
`ageMin`, `complexity`, `complexityLevel`, `year`, `rating`, `isExpansion`,
`category`, `brand`, `image`. (`content_hash` and `source_descriptions` are ingest
concerns — dropped.)

- `GET /products?page&pageSize` — page ≥ 1 (default 1), 1 ≤ pageSize ≤ 100
  (default 24). → `200 { products, page, pageSize, hasNext }`, `502` when the
  catalog upstream fails.
- `GET /products/{id}` — → `200` product + `enrichment: { description, citations }
| null`, `404 { error, message }` for an unknown id, `502` when the catalog
  upstream fails. Enrichment is decoration, not a dependency: AI service down or
  404 → `enrichment: null`, never a 5xx.

Every non-2xx body is `{ error, message }` (`error`: `not_found` | `bad_gateway`).

## 3. Source files

- `src/core/fetch_fn.ts` — `FetchFn` type (`typeof globalThis.fetch`); the
  injectable I/O seam of every HTTP client.
- `src/core/upstream_error.ts` — `UpstreamError` (upstream name, message, optional
  status): network failure, unexpected status, or payload that fails zod parsing.
- `src/core/error_response.ts` — `errorResponseSchema`, the shared non-2xx body.
- `src/catalog/product.ts` — zod schemas + types of the outbound catalog model:
  `productSchema`, `productPageSchema`, `productDetailSchema`, `enrichmentSchema`.
- `src/catalog/mock_catalog_client.ts` — `MockCatalogClient(baseUrl, fetchFn)`:
  `listPage(page, pageSize)`. Owns the upstream wire schema and the legacy→domain
  translation.
- `src/catalog/enrichment_client.ts` — `EnrichmentClient(baseUrl, fetchFn)`:
  `getEnrichment(id)` → `Enrichment | null` (404 → null; anything else broken →
  `UpstreamError`).
- `src/catalog/catalog_service.ts` — `CatalogService(catalogClient,
enrichmentClient)`: `listProducts` delegates; `getProduct` runs catalog scan and
  enrichment fetch concurrently, swallows enrichment `UpstreamError` into `null`,
  propagates catalog failures, returns `null` for unknown ids.
- `src/catalog/catalog_routes.ts` — `CatalogRoutes(service)`: the two routes above,
  zod schemas on querystring/params/responses so they land in the OpenAPI spec.
- `src/core/app_factory.ts` — gains an injectable `fetchFn` (default global fetch),
  wires clients → service → routes, and sets the app error handler mapping
  `UpstreamError` → `502 { error: 'bad_gateway' }` (anything else falls through to
  Fastify's default).

## 4. Tests

Network is the only fake: tests build real clients (and, for routes, the real app
via `AppFactory` + default `Config`) over a faked `fetch`.

- `tests/support/fake_fetch.ts` — `fakeFetch(handler)`, `jsonResponse(body,
status)`, `fakeUpstreams({ catalog, seller })` discriminating on the default
  config hostnames; an omitted upstream behaves as down.
- `tests/support/catalog_fixtures.ts` — raw upstream product/page builders.
- `tests/catalog/mock_catalog_client/list_page.test.ts` — pagination params on the
  wire, legacy→domain field mapping, non-200 → `UpstreamError`, malformed payload →
  `UpstreamError`.
- `tests/catalog/enrichment_client/get_enrichment.test.ts` — 200 parsed, 404 →
  null, 500/network failure → `UpstreamError`.
- `tests/catalog/catalog_service/list_products.test.ts` — delegation.
- `tests/catalog/catalog_service/get_product.test.ts` — composition, multi-page
  scan, unknown id → null, enrichment failure degrades to null, catalog failure
  propagates.
- `tests/catalog/catalog_routes/get_products.test.ts` — 200 mapped body, defaults
  and explicit pagination forwarded upstream, invalid params → 400, upstream down →
  502, `/products` paths present in `/docs/json`.
- `tests/catalog/catalog_routes/get_product_by_id.test.ts` — 200 with enrichment,
  enrichment-down → 200 with null, unknown id → 404, invalid id → 400, catalog
  down → 502.

## 5. Housekeeping

PLAN.md: flip Phase 1 ⬜ → 🔶 and link this spec.

## Verification checklist (all must pass)

1. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` green.
2. With the seller stack up: `curl localhost:3000/products` serves the mock
   catalog through the BFF; `/products/1` returns the composed detail
   (`enrichment` null until the seller endpoint ships).
3. With the stack down: `/health` still 200, `/products` → 502 with the error
   body, `/products/1` → 502.
4. `/docs/json` documents `/products` and `/products/{id}` with the zod-derived
   schemas.
