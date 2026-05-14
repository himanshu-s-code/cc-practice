# CLAUDE.md — Day 2 Inventory Management System

## Stack

- TypeScript (strict), Node 20+
- libSQL (`@libsql/client`) — file-backed in dev, `:memory:` in tests
- Commander.js for CLI
- Zod v3 for input validation
- Vitest for tests
- ESLint + tsc for quality gates

## Rules

1. **Strict TypeScript.** `strict: true`, no `any`, no implicit returns. Public function signatures are explicit.
2. **Zod at every public boundary.** Every exported module function validates its input with a Zod schema. Failures throw `ValidationError`.
3. **Dependency-injected DB client.** Module functions take a libSQL `Client` as their first argument. They never open their own connection. The CLI is the only place that creates a file-backed client.
4. **In-memory SQLite for all tests.** Use the `createTestDb()` helper in `tests/helpers/db.ts`. Each test gets a fresh DB. No shared state, no file artifacts.
5. **Typed errors.** Custom error classes in `src/errors.ts` (`InsufficientStockError`, `NotFoundError`, `ValidationError`). Never throw strings.
6. **Pure modules, thin CLI.** Business logic lives in `src/modules/`. `src/cli/index.ts` only parses args, opens a client, runs `initSchema`, and dispatches.
7. **Schema is authoritative.** All 9 tables live in `src/db/schema.ts`. `initSchema(client)` is idempotent and enables foreign keys.
8. **Quality gates must pass.** `npm run build`, `npm test`, `npm run lint` must all be clean before a task is "done."

## File Layout

```
src/
  db/        schema.ts, client.ts
  modules/   product.ts, stock.ts, order.ts, campaign.ts, accounting.ts
  cli/       index.ts
  errors.ts
  types.ts
tests/
  helpers/db.ts
  modules/*.test.ts
  integration/workflow.test.ts
```

## Conventions

- All monetary values are stored as `REAL` (decimal dollars). Round to 2 dp when computing totals.
- Status enums are validated by Zod and enforced by SQLite `CHECK` constraints.
- Inserts that need the generated id use `RETURNING *`.
- Foreign keys are ON. Cascades only where it makes semantic sense (e.g., `order_items` cascade on `orders` delete).
