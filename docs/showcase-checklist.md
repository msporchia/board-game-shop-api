# Seller-shop showcase checklist

This is the working checklist for turning this repo into the Node/TypeScript proof
inside the broader portfolio project. Keep it concrete: each checked item should be
visible in code, docs, tests or the running demo.

## Goal

Show that this service can be the typed commerce BFF between a React storefront and
a Python AI/RAG service:

- strict TypeScript and runtime boundary validation;
- Fastify route contracts emitted as OpenAPI;
- SQLite persistence behind stores/services;
- tested HTTP behavior and transactional checkout;
- service-to-service `/chat` and `/search` composition;
- purchase-history injection that makes the AI advisor visibly personal.

## 0. Documentation alignment

- [x] Add a cross-repo coordination plan.
- [x] Replace "planning stage" language in the README.
- [x] Document what is implemented versus what is still showcase work.
- [x] Add this repo-local checklist.
- [x] Align `PLAN.md` phase language with the portfolio objective.
- [ ] Add a short "how to review this repo" section once the vertical slice is ready.

## 1. Contract-first TypeScript loop

- [ ] Make `/docs/json` export stable enough for generated web types.
- [ ] Add an `openapi:export` script or documented command.
- [ ] Decide where the generated spec artifact lives, if anywhere.
- [ ] Coordinate with `seller-web` to remove hand-written DTO mirrors.
- [ ] Add a CI check that catches accidental OpenAPI drift, if practical.

## 2. Backend quality hardening

- [ ] Typecheck tests, either via a test tsconfig or an equivalent strict check.
- [ ] Reduce unsafe DB casts where reasonable.
- [ ] Parse JSON fields read from SQLite instead of trusting `JSON.parse(...) as T`.
- [ ] Make `Database.transaction()` behavior explicit for nested transactions.
- [ ] Add a central Fastify error handler for consistent non-2xx response bodies.
- [ ] Quiet test logs/warnings where they distract from meaningful output.

## 3. Chat proxy MVP

- [x] Add a `chat` domain folder.
- [x] Define browser-facing Zod schemas for `POST /chat`.
- [x] Define seller-facing request/response schemas.
- [x] Add injectable fetch for seller calls.
- [x] Forward `message`, `choices`, `sessionId` and `k` to `seller`.
- [x] Validate the seller response before returning it to the browser.
- [x] Enrich returned recommendation cards with shop-owned fields when needed.
- [x] Cover the happy path with a route test.
- [x] Cover upstream non-2xx responses.
- [x] Cover malformed upstream responses.
- [x] Decide whether malformed upstream payloads map to 502 via route catch or central
      error handler.

## 4. Search passthrough

- [ ] Add a `search` domain folder.
- [ ] Validate free-text and facet query params.
- [ ] Map browser-facing camelCase params to seller's expected search contract.
- [ ] Validate seller results before returning them.
- [ ] Keep this route deliberately thin and documented as passthrough.

## 5. Purchase-history injection

- [x] Build `customer_context` from order history inside the BFF.
- [x] Include owned product ids.
- [x] Include recent order summaries with timestamps.
- [x] Ensure the browser cannot forge purchase history in the chat request.
- [x] Add tests proving checkout changes the next chat payload.
- [ ] Coordinate with `seller` on the exact accepted `customer_context` shape.
- [ ] Coordinate with `seller-web` on how to surface the before/after effect.

## 6. Showcase finish

- [ ] Update README with the final vertical-slice walkthrough.
- [ ] Add final API examples for cart, checkout and chat.
- [ ] Link to the web demo screenshot/GIF.
- [ ] Ensure `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`
      and `npm run build` are green.
- [ ] Re-check fresh-start behavior with a new `shop.db`.
- [ ] Keep the final story crisp: Node/TS BFF, not a fake full e-commerce platform.
