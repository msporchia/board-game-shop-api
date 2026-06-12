# Plan

This service's slice of the storefront roadmap. Phase numbers are aligned across the
three repos (seller = [board-game-rag-seller](https://github.com/msporchia/board-game-rag-seller),
web = [board-game-shop-web](https://github.com/msporchia/board-game-shop-web)) so a
phase is "done" when every involved repo's slice is done.
Status legend: ⬜ not started · 🔶 in progress · ✅ done.

## Phase 0 — Scaffold 🔶 · [implementation spec](docs/phase-0.md)

Fastify + TypeScript strict, zod, OpenAPI emission, Vitest, ESLint + Prettier (config
aligned with web). Dockerfile + dev compose service joining the seller stack network.
CI: lint + tests.

**Done when:** `/health` responds through the compose stack and the web placeholder
renders a value fetched from it; CI green.

## Phase 1 — Catalog 🔶 · [implementation spec](docs/phase-1.md)

`GET /products` (paginated) and `GET /products/{id}`, served from the shop's own
catalog store (`shop.db`), seeded from a checked-in JSON snapshot of the same source
that feeds the AI service's pipeline. The seller is the AI engine only — it grows no
shop-facing catalog endpoints.

*Open question (da valutare):* how catalog records flow between the two services —
the AI service pushes enriched records here, or this service owns/generates the
records and feeds them to the AI service for enrichment. Until decided, the seed
JSON is the only source and there is no service-to-service catalog call.

**Done when:** the full catalog is served from the internal store; client types
generated from the emitted OpenAPI.

## Phase 2 — Cart & orders 🔶 · [implementation spec](docs/phase-2.md)

The commerce core, owned here — the web client renders money, it never computes it.
Products gain a price (`priceCents`, seeded/persisted in `shop.db`: the upstream
catalog has none, pricing is this service's domain). Server-side cart per
client-generated `customerId`: `GET /carts/{customerId}`,
`PUT /carts/{customerId}/items/{productId}` (body `{ quantity }`, validated) and
`DELETE` of the same, all returning the full cart with server-computed line/cart
totals. `POST /orders` builds the order atomically from the stored cart (price
snapshot, timestamps), clears it and returns the recap; `GET /orders` for a
customer's history. Timestamps matter: they later let the advisor use real recency
("la settimana scorsa hai preso…").
_Decided (was: da valutare):_ carts live server-side, so the customer can leave and
return to the same cart and the backend can act on it (advisor awareness later).

**Done when:** checkout from the web app lands an order in `shop.db` built from the
server cart; cart and order routes covered by tests.

## Phase 3 — Chat proxy ⬜

`/chat` route proxying to the AI service (session pass-through). Deliberately thin at
this stage — it is the seam Phase 6 fills with customer context.

**Done when:** a multi-turn conversation works end-to-end through the BFF.

## Phase 4 — Search passthrough ⬜

Thin `/search` proxy mapping the faceted params 1:1 — documented as a passthrough, no
fake substance.

**Done when:** the web search page works end-to-end through the BFF.

## Phase 5 — Polish & showcase ⬜

Prod-shaped multi-stage build; README walkthrough of the BFF composition and the
service-to-service calls; this repo's part of the full-stack Playwright e2e (driven
from the web repo).

## Phase 6 — Purchase history injection ⬜

The architectural payoff: fill the Phase-3 seam by injecting the customer's purchase
history (owned game ids + recent orders with timestamps) into the chat request as
`customer_context`. The AI service stays ignorant of customer identity — domain
separation demonstrated on the most interesting use case.
*Requires seller:* `customer_context` accepted on `POST /chat` and used in the
advisor's enforced-vs-generated split (owned games excluded deterministically;
greetings grounded on real orders only), plus a greeting-grounding eval suite.

**Done when:** a purchase visibly changes the next conversation — greeting mentions
it, the owned game disappears from recommendations — and the seller-side grounding
eval is green.
