import { describe, it, expect } from "vitest";
import { createTestDb, seedWarehouse } from "../helpers/db.js";
import { addProduct } from "../../src/modules/product.js";
import {
  createWarehouse,
  getStockStatus,
  listWarehouses,
  stockIn,
  stockOut,
} from "../../src/modules/stock.js";
import { InsufficientStockError } from "../../src/errors.js";

async function seedProduct(db: Awaited<ReturnType<typeof createTestDb>>) {
  return addProduct(db, {
    sku: "SKU1",
    name: "Widget",
    price: 100,
    cost: 60,
  });
}

describe("stock module", () => {
  it("creates and lists warehouses", async () => {
    const db = await createTestDb();
    const w = await createWarehouse(db, { name: "Main", location: "HQ" });
    expect(w.id).toBeGreaterThan(0);
    expect((await listWarehouses(db))).toHaveLength(1);
  });

  it("stockIn increases inventory and records a movement", async () => {
    const db = await createTestDb();
    const product = await seedProduct(db);
    const warehouseId = await seedWarehouse(db);
    const mv = await stockIn(db, {
      productId: product.id,
      warehouseId,
      quantity: 50,
    });
    expect(mv.type).toBe("IN");
    expect(mv.quantity).toBe(50);
    const status = await getStockStatus(db, product.id);
    expect(status[0].quantity).toBe(50);
  });

  it("stockIn aggregates on duplicate product+warehouse", async () => {
    const db = await createTestDb();
    const product = await seedProduct(db);
    const warehouseId = await seedWarehouse(db);
    await stockIn(db, { productId: product.id, warehouseId, quantity: 30 });
    await stockIn(db, { productId: product.id, warehouseId, quantity: 20 });
    const status = await getStockStatus(db, product.id);
    expect(status).toHaveLength(1);
    expect(status[0].quantity).toBe(50);
  });

  it("stockOut decreases inventory and records a movement", async () => {
    const db = await createTestDb();
    const product = await seedProduct(db);
    const warehouseId = await seedWarehouse(db);
    await stockIn(db, { productId: product.id, warehouseId, quantity: 50 });
    await stockOut(db, {
      productId: product.id,
      warehouseId,
      quantity: 10,
    });
    const status = await getStockStatus(db, product.id);
    expect(status[0].quantity).toBe(40);
  });

  it("stockOut throws InsufficientStockError", async () => {
    const db = await createTestDb();
    const product = await seedProduct(db);
    const warehouseId = await seedWarehouse(db);
    await stockIn(db, { productId: product.id, warehouseId, quantity: 5 });
    await expect(
      stockOut(db, { productId: product.id, warehouseId, quantity: 10 }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it("getStockStatus without productId returns all rows", async () => {
    const db = await createTestDb();
    const product = await seedProduct(db);
    const w1 = await seedWarehouse(db, "A");
    const w2 = await seedWarehouse(db, "B");
    await stockIn(db, { productId: product.id, warehouseId: w1, quantity: 1 });
    await stockIn(db, { productId: product.id, warehouseId: w2, quantity: 2 });
    const all = await getStockStatus(db);
    expect(all).toHaveLength(2);
  });
});
