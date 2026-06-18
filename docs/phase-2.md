# Phase 2 — Cart & orders: implementation spec

Goal: the commerce core, owned here — the web client renders money, it never
computes it. Products gain a price; carts live server-side per customer; orders are
built atomically from the stored cart. Conventions in `CLAUDE.md` apply to every
file.

## 1. Identity and money

- `X-Customer-Id` — client-generated demo identity header (no auth):
  `^[A-Za-z0-9_-]{1,64}$`, validated on every customer-scoped route
  (`src/customers/customer_headers.ts`).
- Money is integer cents (`*Cents`), computed server-side only: unit price, line
  totals (`unitPriceCents × quantity`), cart/order totals.

## 2. Pricing

The catalog snapshot has no price — pricing is this service's domain. The seeder
assigns a deterministic demo price derived from the game's own fields:

```
priceCents = 1500 + complexityLevel × 700 + durationMin × 10
```

(Catan → 36.50 €, Carcassonne → 25.50 €.) Persisted in `products.price_cents` and
exposed as `priceCents` on the product model, so the same number reaches the web
list, the cart and the order snapshot.

Schema note: changing `shop.db` tables is wipe-and-reseed (delete the file) — the
demo has no migration story by design.

## 3. This service's API

- `GET /cart` → `200` the current customer's cart (empty cart for a never-seen
  customer — carts are implicit, never 404).
- `PUT /cart/items/{productId}` body `{ quantity }` (int, 1–99) — upserts the line →
  `200` full cart; `404` unknown product.
- `DELETE /cart/items/{productId}` — idempotent → `200` full cart.
- `POST /orders` — builds the order atomically from the current customer's stored
  cart (price/name snapshot, ISO-8601 UTC `createdAt`), clears the cart →
  `201` the order; `409 { error: 'empty_cart' }` when there is nothing to order.
- `GET /orders` → `200 { orders }`, newest first — the history source Phase 6 reduces
  to received product ids for the advisor context.

All customer-scoped routes require `X-Customer-Id`; the customer id is deliberately
not accepted in paths, querystrings or request bodies.

Shapes: cart `{ customerId, items, totalCents }`, item `{ productId, name, image,
unitPriceCents, quantity, lineTotalCents }`; order `{ id, customerId, createdAt,
totalCents, items }`, order item = cart item minus `image`.

## 4. Source files

- `src/core/database.ts` — `Database(path)`: the shared `node:sqlite` handle for
  `shop.db` plus `transaction(fn)`; stores receive it via constructor and own their
  tables. (`CatalogStore` is refactored onto it.)
- `src/customers/customer_id.ts` — `customerIdSchema`.
- `src/customers/customer_headers.ts` — `X-Customer-Id` route header schema and
  extraction helper.
- `src/catalog/product.ts` — gains `priceCents`; `catalog_store.ts` the column;
  `catalog_seeder.ts` the pricing rule.
- `src/carts/cart.ts` — zod schemas + types (`cartSchema`, `cartItemSchema`).
- `src/carts/cart_store.ts` — raw lines table `cart_items(customer_id, product_id,
quantity)`: `itemsFor`, `upsertItem`, `removeItem`, `clear`.
- `src/carts/cart_service.ts` — `CartService(cartStore, catalogStore)`: composes
  lines with catalog data, computes totals; `getCart`, `setItem` (null on unknown
  product), `removeItem`.
- `src/carts/cart_routes.ts` — the three routes above.
- `src/orders/order.ts` — zod schemas + types.
- `src/orders/order_store.ts` — `orders` + `order_items` tables: `insert`,
  `listFor` (newest first).
- `src/orders/order_service.ts` — `OrderService(database, cartService, cartStore,
orderStore, now)`: `checkout` (null on empty cart; insert + cart clear in one
  transaction), `history`. `now` injectable for tests, defaults to `Date`.
- `src/orders/order_routes.ts` — the two routes above.
- `src/core/app_factory.ts` — opens the one `Database`, wires stores → services →
  routes, closes it with the app.

## 5. Tests

`tests/support/build_app.ts` builds the real app over `:memory:` + the catalog
fixture. Store/service tests construct their classes on a `:memory:` `Database`.

- `tests/core/database/transaction.test.ts` — commit, rollback on throw.
- `tests/catalog/…` — updated for `priceCents` (rule asserted in the seeder test).
- `tests/carts/cart_store/` — line round-trip, upsert overwrite, remove, clear.
- `tests/carts/cart_service/` — totals math, unknown product, idempotent remove.
- `tests/carts/cart_routes/` — empty cart, PUT/DELETE flows, 404 unknown product,
  400 invalid quantity/customer header.
- `tests/orders/order_store/` — insert/list round-trip, newest first.
- `tests/orders/order_service/checkout.test.ts` — snapshot + totals, cart cleared,
  empty cart → null.
- `tests/orders/order_routes/` — POST 201 then empty cart, 409 on empty, GET
  history, 400 validation.

## Verification checklist (all must pass)

1. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` green.
2. Built server, fresh DB: PUT two cart lines → totals correct; POST /orders →
   201 with snapshot, GET /cart now empty, GET /orders shows the order; second
   POST → 409; restart → order survives.
3. `/docs/json` documents the cart and order routes.
