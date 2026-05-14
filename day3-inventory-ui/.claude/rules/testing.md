# Testing rules

These rules apply to every test file under `tests/` and any colocated `*.test.ts(x)` file in this project.

## 1. Test names are written in Japanese

Use Japanese for `describe` and `it` (or `test`) names. The test name should describe **what behavior** the test asserts, in user-facing terms.

```ts
describe("商品モジュール", () => {
  it("有効な商品を追加できる", () => { /* ... */ });
  it("価格が負の場合はエラーになる", () => { /* ... */ });
});
```

Avoid:
- English names like `it("adds a product")`.
- Implementation-detail names like `it("calls db.execute with correct args")`.

## 2. Body follows the AAA structure

Every test body is divided into three labelled sections with comments, in this order:

```ts
it("有効な商品を追加できる", async () => {
  // Arrange
  const db = await createTestDb();
  const input = { sku: "A1", name: "Widget", price: 100, cost: 60 };

  // Act
  const product = await addProduct(db, input);

  // Assert
  expect(product.id).toBeGreaterThan(0);
  expect(product.sku).toBe("A1");
});
```

- **Arrange**: build inputs, fixtures, mocks. No assertions, no production calls beyond setup.
- **Act**: call the function-under-test exactly once. If you need multiple calls, prefer multiple tests.
- **Assert**: only `expect(...)` calls. No further setup.

## 3. One behavior per test

If a test body has multiple Act steps, split it. Tests should fail for one reason.

## 4. No shared state across tests

Each test creates its own DB / fixtures. Use `createTestDb()` (in `tests/helpers/db.ts` if present) or the equivalent factory.
