# Plan

This service's slice of the storefront roadmap. The project is a portfolio showcase:
`seller` proves the AI/RAG work, `seller-shop` proves Node/TypeScript backend and BFF
composition, and `seller-web` proves React/TypeScript storefront work. Phase numbers
are aligned across the three repos (seller =
[board-game-rag-seller](https://github.com/msporchia/board-game-rag-seller), web =
[board-game-shop-web](https://github.com/msporchia/board-game-shop-web)) so a phase is
"done" only when every involved repo's slice is done.

Status legend: ⬜ not started · 🔶 in progress · ✅ done.

Working documents:

- Cross-repo plan: [docs/cross-repo-showcase-plan.md](docs/cross-repo-showcase-plan.md).
- This repo's active checklist: [docs/showcase-checklist.md](docs/showcase-checklist.md).

## Current local state

Implemented locally: Fastify scaffold, config validation, OpenAPI emission, owned
catalog, SQLite seeding, server-side carts, transactional checkout, order history and
the first `/chat` BFF proxy. Chat requests now include server-built
`customer_context` from real order history. The local quality gates are green. The
remaining work is about turning this from a good backend demo into the BFF slice of
the full showcase: generated web contracts, seller-side context usage, `/search` and
final docs/polish.

## Phase 0 — Scaffold 🔶 · [implementation spec](docs/phase-0.md)

Fastify + TypeScript strict, zod, OpenAPI emission, Vitest, ESLint + Prettier (config
aligned with web). Dockerfile + dev compose service joining the seller stack network.
CI: lint + tests.

**Local shop status:** implemented.

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

**Local shop status:** implemented and covered by route/store/seeder tests. The
contract-generation link with the web app remains part of the showcase hardening.

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

**Local shop status:** implemented and covered by cart/order route, service and store
tests.

**Done when:** checkout from the web app lands an order in `shop.db` built from the
server cart; cart and order routes covered by tests.

## Phase 3 — Chat proxy 🔶

`/chat` route proxying to the AI service (session pass-through). Deliberately thin at
this stage — it is the seam Phase 6 fills with customer context.

This is the next high-value backend milestone because it proves service-to-service
composition: browser → Node BFF → Python AI/RAG → Node BFF → browser.

**Local shop status:** first cut implemented. The route forwards `sessionId`,
`message`, `choices` and `k`, validates the seller response and enriches returned
game ids with shop-owned catalog data. Upstream non-2xx and malformed seller payloads
map to the browser-facing `502` contract. The Phase-6 `customer_context` payload is
now built from shop-owned order history.

**Done when:** a multi-turn conversation works end-to-end through the BFF.

## Phase 4 — Search passthrough ⬜

Thin `/search` proxy mapping the faceted params 1:1 — documented as a passthrough, no
fake substance.

**Done when:** the web search page works end-to-end through the BFF.

## Phase 5 — Polish & showcase ⬜

Backend hardening and storytelling: generated-contract workflow, consistent error
responses, clearer transaction behavior, safer DB parsing, README walkthrough of the
BFF composition and this repo's part of the full-stack Playwright e2e (driven from
the web repo). A prod-shaped multi-stage build is useful, but lower priority than
the chat-to-cart vertical slice.

## Phase 6 — Purchase history injection 🔶

The architectural payoff: fill the Phase-3 seam by injecting the customer's purchase
history (owned game ids + recent orders with timestamps) into the chat request as
`customer_context`. The AI service stays ignorant of customer identity — domain
separation demonstrated on the most interesting use case.
*Requires seller:* `customer_context` accepted on `POST /chat` and used in the
advisor's enforced-vs-generated split (owned games excluded deterministically;
greetings grounded on real orders only), plus a greeting-grounding eval suite.

**Local shop status:** BFF-side payload construction is implemented and tested. The
browser cannot supply the context; the BFF derives it from stored orders. Seller-side
usage and UI surfacing remain.

**Done when:** a purchase visibly changes the next conversation — greeting mentions
it, the owned game disappears from recommendations — and the seller-side grounding
eval is green.
