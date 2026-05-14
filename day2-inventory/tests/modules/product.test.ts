import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db.js";
import {
  addProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "../../src/modules/product.js";
import {
  DuplicateError,
  NotFoundError,
  ValidationError,
} from "../../src/errors.js";

describe("product module", () => {
  it("adds and lists products", async () => {
    const db = await createTestDb();
    const p = await addProduct(db, {
      sku: "SKU1",
      name: "Widget",
      price: 100,
      cost: 60,
    });
    expect(p.id).toBeGreaterThan(0);
    expect(p.sku).toBe("SKU1");
    const list = await listProducts(db);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Widget");
  });

  it("rejects invalid input", async () => {
    const db = await createTestDb();
    await expect(
      addProduct(db, {
        sku: "",
        name: "Bad",
        price: -1,
        cost: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates a product", async () => {
    const db = await createTestDb();
    const p = await addProduct(db, {
      sku: "SKU1",
      name: "Widget",
      price: 100,
      cost: 60,
    });
    const updated = await updateProduct(db, p.id, { price: 150 });
    expect(updated.price).toBe(150);
    expect(updated.name).toBe("Widget");
  });

  it("throws NotFoundError when updating missing product", async () => {
    const db = await createTestDb();
    await expect(
      updateProduct(db, 999, { price: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes a product", async () => {
    const db = await createTestDb();
    const p = await addProduct(db, {
      sku: "SKU1",
      name: "Widget",
      price: 100,
      cost: 60,
    });
    await deleteProduct(db, p.id);
    expect(await listProducts(db)).toHaveLength(0);
  });

  it("throws NotFoundError when deleting missing product", async () => {
    const db = await createTestDb();
    await expect(deleteProduct(db, 999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws DuplicateError when adding a product with an existing SKU", async () => {
    const db = await createTestDb();
    await addProduct(db, {
      sku: "MBP-2024",
      name: "MacBook Pro",
      price: 298000,
      cost: 200000,
    });
    await expect(
      addProduct(db, {
        sku: "MBP-2024",
        name: "Different name, same SKU",
        price: 1,
        cost: 1,
      }),
    ).rejects.toBeInstanceOf(DuplicateError);
  });

  it("throws DuplicateError when updating a product to an existing SKU", async () => {
    const db = await createTestDb();
    await addProduct(db, { sku: "A", name: "A", price: 1, cost: 1 });
    const b = await addProduct(db, { sku: "B", name: "B", price: 1, cost: 1 });
    await expect(updateProduct(db, b.id, { sku: "A" })).rejects.toBeInstanceOf(
      DuplicateError,
    );
  });
});
