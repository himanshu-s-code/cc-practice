# API route rules

These rules apply to every file under `src/app/api/**/route.ts` and to every Server Action in `src/lib/actions/*`.

## 1. Wrap every handler body in try/catch

Module functions throw typed errors (`ValidationError`, `InsufficientStockError`, `NotFoundError`, `DuplicateError`). The handler **must** catch them and return a structured response. Never let an exception escape the route handler.

```ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();
    const result = await someModuleFunction(db, body);
    return successResponse(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
```

## 2. Always return the `{ data, error }` envelope

Every API response body — success or failure — has the shape:

```ts
{ data: T | null, error: { name: string, message: string, details?: unknown } | null }
```

Use the helpers in `src/lib/api-response.ts`:
- `successResponse(data, init?)` — `{ data, error: null }`, default 200 (or pass `{ status: 201 }` for create).
- `errorResponse(err)` — maps the error to the right HTTP status (400 / 404 / 409 / 500) and `{ data: null, error: {...} }`.

## 3. HTTP status mapping is centralized

Do **not** call `NextResponse.json(...)` with a hand-picked status from inside a handler. The mapping lives in `errorResponse`:
- `ValidationError` → 400
- `InsufficientStockError` → 400
- `NotFoundError` → 404
- `DuplicateError` → 409
- anything else → 500

If a new error type is introduced, extend `errorResponse` — not the route.

## 4. Server Actions follow the same envelope

Server Actions in `src/lib/actions/*.ts` return `{ data, error }` as well — but they don't return `NextResponse`; they return a plain object that the client component can pattern-match on.

```ts
const result = await createProductAction(values);
if (result.error) toast.error(result.error.message);
else toast.success("Saved");
```

## 5. Validate input with Zod at the boundary

Every handler that accepts a request body parses it through a Zod schema (or delegates to a module function that does). Reject invalid input as `ValidationError`.
