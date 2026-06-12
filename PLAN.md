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

## Phase 1 — Catalog ⬜

`GET /products` (paginated, reading from the upstream mock catalog) and
`GET /products/{id}` composing the base product with the enriched description fetched
from the AI service — the first real service-to-service call.
*Requires seller:* enriched-detail endpoint exposing the enrichment-store description
(+ citations) for one `id_product`.

**Done when:** the full catalog is served through this BFF; the detail response
carries pipeline-enriched content; client types generated from the emitted OpenAPI.

## Phase 2 — Orders ⬜

`POST /orders` persisting orders to `shop.db` with timestamps, keyed by a
client-generated `customer_id`; `GET /orders` for a customer's history. Timestamps
matter: they later let the advisor use real recency ("la settimana scorsa hai
preso…").

**Done when:** checkout from the web app lands an order in `shop.db`; order routes
covered by tests.

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
