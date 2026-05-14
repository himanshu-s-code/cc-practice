# CLAUDE.md — Day 3 Inventory UI

## Stack

- Next.js 14 (App Router), React 18, TypeScript (strict).
- Tailwind CSS v3 + shadcn/ui (style: new-york, base color: slate).
- libSQL (`@libsql/client`) — shared file `../day2-inventory/inventory.db`, overridable via `DB_URL`.
- Zod for validation, react-hook-form for forms.
- Vitest 2 for tests, Prettier for formatting.

## Ports

- **Web server: http://localhost:3000** (Next.js dev + prod).
- No separate frontend port — Next.js serves UI + API from a single process.

## Quality gates

- `npm run build` — Next.js production build (also type-checks).
- `npm test` — Vitest unit tests.
- `npm run lint` — Next/ESLint.
- `npm run format` — Prettier write across the repo.

## Environment

`.env.local`:
```
DB_URL=file:../day2-inventory/inventory.db
```

The DB file lives in the sibling `day2-inventory/` project; both the CLI and the web UI mutate the same schema. Don't initialize twice.

## File layout

```
src/
  app/
    layout.tsx                 # mounts <Toaster />
    page.tsx                   # redirects → /products
    products/page.tsx          # Server Component: lists products
    api/
      products/route.ts        # GET, POST
      products/[id]/route.ts   # PATCH, DELETE
      stock/route.ts           # GET
      orders/route.ts          # POST
  components/
    ui/                        # shadcn-generated
    products/
      products-table.tsx       # Client
      product-form-dialog.tsx  # Client (react-hook-form + zod)
      delete-product-button.tsx
  lib/
    db/
      client.ts                # libSQL singleton on globalThis
      schema.ts                # migrated from day2
      mappers.ts               # migrated from day2
    modules/                   # migrated from day2 (product/stock/order/campaign/accounting/import)
    actions/
      product-actions.ts       # "use server" Server Actions
    errors.ts                  # migrated from day2 (+ DuplicateError)
    types.ts                   # migrated from day2
    api-response.ts            # successResponse / errorResponse helpers
    utils.ts                   # cn() (shadcn)
tests/
  sample.test.ts               # demonstrates the testing rules
.claude/
  settings.json                # PreToolUse + PostToolUse hooks
  hooks/
    block-dangerous.sh         # blocks rm -rf, git push --force
    protect-files.sh           # blocks edits to .env*, package-lock.json
    format.sh                  # runs prettier post-edit
  rules/
    testing.md
    api-routes.md
```

## Rules

1. **Server Components are the default.** Add `"use client"` only when you need state, effects, event handlers, or shadcn primitives with listeners (Dialog, DropdownMenu, Form, etc.).
2. **Mutations go through Server Actions** in `src/lib/actions/*`, not via `fetch("/api/...")` from the client.
3. **Module code is server-only.** Every file under `src/lib/db/`, `src/lib/modules/`, and `src/lib/actions/` starts with `import "server-only";`.
4. **DB access goes through `getDb()`** (`src/lib/db/client.ts`), which singletons the libSQL client on `globalThis` and runs `initSchema` once.
5. **API responses are `{ data, error }` envelopes.** Always go through `successResponse` / `errorResponse` (`src/lib/api-response.ts`). Never call `NextResponse.json` directly from a route.
6. **Typed errors only.** Throw `ValidationError`, `NotFoundError`, `DuplicateError`, or `InsufficientStockError`. The error-to-status mapping lives in `errorResponse`.
7. **Tests follow `@.claude/rules/testing.md`** (Japanese names, AAA structure).
8. **API routes and actions follow `@.claude/rules/api-routes.md`** (try/catch, envelope, central status mapping).

@.claude/rules/testing.md
@.claude/rules/api-routes.md

## Skill in use

The user-level skill `shadcn-page` (at `~/.claude/skills/shadcn-page/SKILL.md`) was used to scaffold the Product Management page. Re-invoke it whenever adding a new CRUD page (orders, stock, etc.).

## Known constraints

- Node 18.19 is currently installed. Next 14 + Vitest 2 work; Next 15+, Tailwind v4, and Vitest 4 require Node 20+. Upgrade Node when convenient.
- The post-edit prettier hook is best-effort — failures are swallowed so they don't stall edits.
- Hooks load when Claude Code starts a session, not mid-session. After installing/changing `.claude/settings.json`, restart the CLI.
