---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/page.tsx"
---

# React component rules

These rules apply to every component file under `src/components/**/*.tsx` and every Server Component under `src/app/**/page.tsx`.

## 1. Server Components are the default

Don't put `"use client"` at the top of a file unless the component actually needs state, effects, event handlers, refs, or a hook from a client library (react-hook-form, react-query, etc.). Server Components are smaller, faster, and can call DB helpers directly via `getDb()`.

## 2. Push interactivity down

If a page needs *one* interactive thing in a sea of static content, extract the interactive piece into its own client component. The page itself stays a Server Component and fetches the data.

```
src/app/widgets/page.tsx       ← Server: fetches list, renders WidgetsTable
src/components/widgets/widgets-table.tsx  ← Client: handles row clicks, dialogs
```

## 3. Props are typed; no `any`

- Reuse `*Input`/`*Result` types exported by `src/lib/modules/*` rather than redeclaring them in components.
- For shadcn primitives, prefer `React.ComponentProps<typeof X>` over re-typing.

## 4. No fetch from client for mutations

Write paths go through Server Actions imported from `src/lib/actions/*`. Don't `fetch("/api/...", { method: "POST" })` from a Client Component within the same Next.js app — Server Actions get free `revalidatePath` and type safety.

Reads from a Client Component (e.g., re-fetching after filter changes) *can* use `fetch` against the API routes; that's fine.

## 5. Empty / loading / error states

Every list-rendering component should explicitly handle:
- empty state — friendly message + primary action
- loading — disabled controls and a spinner-text on async work via `useTransition`
- error — surface via `toast.error(...)`; never silently swallow

## 6. Accessibility minimums

- Every form input has a visible `<FormLabel>` or `aria-label`.
- Icon-only buttons include `<span className="sr-only">…</span>`.
- Dialogs use `<DialogTitle>` + `<DialogDescription>` (shadcn `Dialog` already nudges this).

## 7. shadcn primitives over raw HTML

Don't reinvent buttons/cards/tables/inputs. Use the components in `src/components/ui/*`. They handle dark-mode tokens, focus rings, and a11y wiring.
