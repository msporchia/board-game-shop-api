# CLAUDE.md

## What this repo is

`board-game-shop-api` — the Node commerce backend and **BFF** of a three-repo
board-game e-commerce demo. Read `README.md` (role, architecture, stack rationale)
and `PLAN.md` (phased roadmap; each phase gets a detailed spec in `docs/` when it
starts). Sibling checkouts: `../seller` (Python AI/RAG service, owns the compose
stack) and `../seller-web` (React UI). This is a portfolio/showcase project: code
quality is the product.

## Code structure convention

- **Folder = domain** (`src/catalog/`, `src/orders/`, `src/chat/`), never
  folder-by-type.
- **One class per file.** A small _private_ helper serving only the file's
  protagonist may cohabit; anything used from outside gets its own module.
- **Anything with behavior or I/O is a class**, injectable via constructor. Pure data
  manipulation belongs on the model it manipulates.
- **Route handlers never contain logic** — they validate (zod) and delegate to
  injectable domain classes.
- **No barrel `index.ts` re-exports.** Deep, explicit imports from the module that
  defines the name.
- **`src/main.ts` is the only composition root** — the one place with side effects at
  import time.
- **Tests mirror src**: directory = class under test, file = method/aspect. Routes are
  tested through `app.inject()`, never a live server. Explicit imports from `vitest`
  (no globals).

## Stack (pinned by design — see README for rationale)

Node 22 + Fastify v5, TypeScript strict ESM (NodeNext, `noUncheckedIndexedAccess`),
zod on every boundary, `fastify-type-provider-zod` so the OpenAPI spec derives from
the zod schemas, SQLite for owned data, Vitest. Prettier:
`{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }`
(shared spec with seller-web — do not drift).

## Language

- Code, comments, docs, commit messages: English.
- No `Co-Authored-By` trailers in commits.

## Tooling

Node v22 and npm are available locally (nvm). Use the npm scripts (`lint`,
`format:check`, `typecheck`, `test`); all must be green before a phase is done. The
full stack (Qdrant, Ollama, mock catalog, seller-api) runs from `../seller` via
docker compose; this service's own compose file joins its external network
`seller_default`, but must boot fine without it.
