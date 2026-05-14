---
paths:
  - "src/lib/db/schema.ts"
  - "src/lib/db/migrations/**/*.ts"
  - "src/lib/db/migrations/**/*.sql"
---

# Database / migration rules

These rules apply when editing `src/lib/db/schema.ts` or any migration file.

## 1. Schema is authoritative; migrations are append-only

`src/lib/db/schema.ts` describes the *current* schema and is idempotent (uses `CREATE TABLE IF NOT EXISTS`). It can be re-run any number of times against any DB.

Migration files, if/when introduced, are immutable history. **Never edit a migration that has already shipped** — write a new one to alter the change.

## 2. Foreign keys are on; cascades are deliberate

`PRAGMA foreign_keys = ON` runs at the top of `initSchema`. Adding a new table with a foreign key requires deciding:
- `ON DELETE CASCADE` — child rows die with the parent (e.g., `order_items` cascade from `orders`)
- `ON DELETE SET NULL` — child rows are detached but kept
- *no cascade* — deletion fails if children exist (the safest default for accounting / audit data)

Document the cascade choice in a one-line comment next to the FK clause.

## 3. Money is `REAL`; statuses are `TEXT CHECK`

- Money columns: `REAL NOT NULL CHECK (col >= 0)` and round to 2 dp in TypeScript.
- Enum-like columns: `TEXT NOT NULL CHECK (col IN ('A','B','C'))` — never integers. Zod schemas at the module boundary must use the same set.

## 4. Add to schema.ts, then update Zod + types + mappers

When adding a column:
1. Append the column to the right `CREATE TABLE` in `schema.ts`.
2. Update the matching interface in `src/lib/types.ts`.
3. Update the row mapper in `src/lib/db/mappers.ts`.
4. Update any module Zod schema that validates input for inserts/updates.

Skipping any of these four results in a silent loss of data or a runtime cast error — they always travel together.

## 5. No SELECT * in production code

Module functions explicitly list columns or use `RETURNING <columns>`. `SELECT *` in `schema.ts` migration helpers is fine; in module code it makes column additions break mappers silently.

## 6. Idempotent guards

Every schema-mutating statement must work on a fresh DB *and* on an existing one:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN` — wrap in a check that catches "duplicate column name" if you cannot use `IF NOT EXISTS` (SQLite doesn't support it for ADD COLUMN).
