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

The old Phase 0/1/2 implementation specs were removed after completion; this file is
the active roadmap.

## Current local state

Implemented locally: Fastify scaffold, config validation, OpenAPI emission, owned
catalog, SQLite seeding, server-side carts, transactional checkout, order history and
the first `/chat` BFF proxy. Chat requests now include server-built
`customer_context` from real order/cart state. The OpenAPI export command and contract
tests are in place. The local quality gates are green. The remaining work is about
turning this from a good backend demo into the BFF slice of the full showcase:
real-stack contract verification with the web app, seller-side context usage,
`/search` and final docs/polish.

## Phase 0 — Scaffold 🔶

Fastify + TypeScript strict, zod, OpenAPI emission, Vitest, ESLint + Prettier (config
aligned with web). Dockerfile + dev compose service joining the seller stack network.
CI: lint + tests.

**Local shop status:** implemented.

**Done when:** `/health` responds through the compose stack and the web placeholder
renders a value fetched from it; CI green.

## Phase 1 — Catalog 🔶

`GET /products` (paginated) and `GET /products/{id}`, served from the shop's own
catalog store (`shop.db`), seeded from a checked-in JSON snapshot of the same source
that feeds the AI service's pipeline. The seller is the AI engine only — it grows no
shop-facing catalog endpoints.

Production-shaped catalog flow: this service creates and owns the commerce product,
then asks seller to index/enrich it; seller can call back with cleaned/enriched fields
without becoming the commerce source of truth. In the current demo, the seed JSON is
the only source and there is no product-write or enrichment-callback API.

**Local shop status:** implemented and covered by route/store/seeder tests. The web
app now generates types from this service's OpenAPI spec; final full-stack contract
verification remains part of the showcase hardening.

**Done when:** the full catalog is served from the internal store; client types
generated from the emitted OpenAPI.

## Phase 2 — Cart & orders 🔶

The commerce core, owned here — the web client renders money, it never computes it.
Products gain a price (`priceCents`, seeded/persisted in `shop.db`: the upstream
catalog has none, pricing is this service's domain). Server-side cart per
client-generated demo identity, carried as the required `X-Customer-Id` header:
`GET /cart`, `PUT /cart/items/{productId}` (body `{ quantity }`, validated) and
`DELETE` of the same, all returning the full cart with server-computed line/cart
totals. `POST /orders` builds the order atomically from the stored cart (price
snapshot, timestamps), clears it and returns the recap; `GET /orders` returns the
current customer's history. Timestamps remain useful for audit and an eventual
order-history UI; the current advisor context deliberately stays simple and sends
product ids only.
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
`message`, `choices` and `k`; the current customer is read from `X-Customer-Id`, not
from the body. It validates the seller response and enriches returned game ids with
shop-owned catalog data. It accepts the seller's `id_product` game ids and normalizes
them to the browser-facing `id` contract. Upstream non-2xx and malformed seller
payloads map to the browser-facing `502` contract. The Phase-6 `customer_context`
payload is now built from shop-owned order/cart state.

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

## Phase 6 — Commerce context injection 🔶

The architectural payoff: fill the Phase-3 seam by injecting the customer's commerce
state (received products, sent products, cart products) into the chat request as
`customer_context`. The AI service stays ignorant of customer identity — domain
separation demonstrated on the most interesting use case.
*Requires seller:* `customer_context` accepted on `POST /chat` and used in the
advisor's enforced-vs-generated split (received games excluded deterministically,
cart games treated as already in-progress, sent games treated as on the way), plus
seller-side grounding/eval coverage.

**Local shop status:** BFF-side payload construction is implemented and tested. The
browser cannot supply the context; the BFF derives it from stored orders and cart
state. Seller-side usage and UI surfacing remain.

**Done when:** a purchase or cart change visibly changes the next conversation — the
received game disappears from recommendations, cart games are not re-pitched as new
ideas — and the seller-side grounding eval is green.
