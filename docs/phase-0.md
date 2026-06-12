# Phase 0 — Scaffold: implementation spec

Goal: a Fastify + TypeScript strict scaffold with tooling, a `/health` endpoint,
OpenAPI emission, tests, Dockerfile + compose, CI. No catalog/orders/chat logic yet —
that starts in Phase 1. Conventions in `CLAUDE.md` apply to every file.

## 1. package.json

- name `board-game-shop-api`, `"type": "module"`, engines node >=22.
- Scripts: `dev` (tsx watch src/main.ts), `build` (tsc), `start` (node dist/main.js),
  `typecheck` (tsc --noEmit), `lint` (eslint .), `format` / `format:check` (prettier),
  `test` (vitest run), `test:watch` (vitest).
- Runtime deps: fastify (v5), @fastify/cors, @fastify/swagger, @fastify/swagger-ui,
  zod, fastify-type-provider-zod.
- Dev deps: typescript, tsx, vitest, @types/node, eslint, typescript-eslint,
  eslint-config-prettier, prettier.
- Current stable versions; if fastify-type-provider-zod constrains the zod major, pin
  the major it supports and note it.

## 2. tsconfig.json

strict, module/moduleResolution NodeNext, target ES2022,
`noUncheckedIndexedAccess: true`, outDir `dist`, rootDir `src`, include `src`.
Vitest handles TS natively — no separate test tsconfig unless something forces it.

## 3. Source files

- `src/main.ts` — composition root: `Config.fromEnv(process.env)` → `AppFactory` →
  listen. The only file with side effects at import time.
- `src/core/config.ts` — `Config` class, `static fromEnv(env): Config`, validated with
  zod. Fields and defaults: port 3000, host `0.0.0.0`, corsOrigin
  `http://localhost:5173`, sellerApiUrl `http://seller-api:8000`, mockCatalogUrl
  `http://mock-prestashop:8001`.
- `src/core/app_factory.ts` — `AppFactory` (constructor takes Config),
  `create(): FastifyInstance`: registers the zod type provider, @fastify/cors (origin
  from config), @fastify/swagger (OpenAPI 3.x with service title/description) +
  swagger-ui at `/docs`, then the route classes.
- `src/health/health_routes.ts` — `HealthRoutes` class with `register(app)`:
  `GET /health` → `{ status: 'ok', service: 'board-game-shop-api' }`, response schema
  declared via zod so it lands in the OpenAPI spec.

## 4. Tests

- `tests/health/health_routes.test.ts` — app via AppFactory + default Config,
  `app.inject()`: 200, json content-type, exact body.
- `tests/core/config.test.ts` — defaults, env overrides, invalid port rejected.
- `vitest.config.ts` — globals off.

## 5. Lint/format

- `eslint.config.js` (flat): typescript-eslint recommended (type-checked if it doesn't
  fight the setup), eslint-config-prettier last, ignore `dist/`.
- `.prettierrc.json`: exactly the shared spec from CLAUDE.md.

## 6. Docker

- `Dockerfile` (dev-shaped): node:22-alpine, WORKDIR /app, install via lockfile,
  CMD npm run dev. Comment: `# TODO Phase 5: multi-stage production build`.
- `docker-compose.yml`: service `seller-shop`, build `.`, ports 3000:3000, volumes
  `.:/app` + anonymous `/app/node_modules`, env SELLER_API_URL / MOCK_CATALOG_URL as
  above, attached to its default network AND the external network
  `name: seller_default, external: true` (the Python stack's network). The service
  must boot fine when that stack is down — `/health` has no upstream dependency.

## 7. CI

`.github/workflows/ci.yml`: push/PR, node 22 + npm cache, `npm ci`, lint,
format:check, typecheck, test.

## 8. Housekeeping

- `.gitignore`: node_modules, dist, coverage, .env, \*.db.
- `.env.example` with the env vars, one-line comments.
- README.md: update the "Development" section only (real commands: install, dev, test,
  lint, compose). PLAN.md: flip Phase 0 ⬜ → 🔶 (stays 🔶 until the web slice is done
  too).

## Verification checklist (all must pass)

1. `npm install` clean.
2. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` green.
3. Server started briefly: `curl localhost:3000/health` returns the expected JSON; the
   OpenAPI spec route served by swagger-ui contains the `/health` path.
4. `npm run build` succeeds and `node dist/main.js` boots.
