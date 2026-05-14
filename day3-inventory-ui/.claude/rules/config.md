---
paths:
  - "next.config.mjs"
  - "next.config.ts"
  - "tailwind.config.ts"
  - "postcss.config.mjs"
  - "tsconfig.json"
  - "vitest.config.ts"
  - "playwright.config.ts"
  - ".eslintrc*"
  - "eslint.config.*"
  - "components.json"
---

# Config-file rules

These rules apply when editing project config files (Next.js, Tailwind, TypeScript, Vitest, Playwright, ESLint, shadcn).

## 1. Touch as little as possible

Config files are load-bearing — a bad edit breaks every page, every test, every build. Before changing, ask: can this be achieved at the call site instead? (e.g., a one-off prettier ignore in code rather than a global config.)

## 2. Match the version

- This project is on **Next.js 14** (App Router), **Tailwind v3**, **Vitest 2** because Node 18.19 can't run Next 16 / Tailwind v4 / Vitest 4. When upgrading, upgrade Node first.
- Don't bring config snippets from a different stack (Next 15 docs, Tailwind v4 `@import` syntax, Vitest 4 `defineProject`) without verifying compatibility.

## 3. `tsconfig.json` — preserve the path alias

`"@/*": ["./src/*"]` is referenced from everywhere. Don't rename the alias; if you must add another, append it.

## 4. `vitest.config.ts` — mirror the alias

Vitest doesn't read `tsconfig` paths automatically. The alias is duplicated in `vitest.config.ts`. If you change one, change the other.

## 5. `tailwind.config.ts` — content globs

`content` must include `src/{app,components,pages}/**/*.{ts,tsx,mdx}`. Adding code outside these globs means Tailwind purges classes it shouldn't.

## 6. `next.config.mjs` — keep it minimal

Most "config tweaks" people reach for (`output: "standalone"`, custom webpack rules, experimental flags) belong elsewhere. Add only what's strictly necessary, and always with a comment explaining why.

## 7. ESLint — don't disable rules in config

If a rule fires on a single file, suppress it inline with `// eslint-disable-next-line <rule>` and a comment explaining why. Disabling project-wide hides bugs.

## 8. After editing, always run the gates

A config change isn't done until:
- `npm run build` passes
- `npm run lint` passes
- `npm test` passes
- `npm run dev` starts without warnings

Skipping any of these is the most common way a config change breaks the project.
