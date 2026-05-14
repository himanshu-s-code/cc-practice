import { describe, it, expect } from "vitest";
import { createTestDb, seedWarehouse } from "../helpers/db.js";
import { addProduct } from "../../src/modules/product.js";
import {
  getStockAlerts,
  setStockThreshold,
  stockIn,
  stockOut,
} from "../../src/modules/stock.js";
import { NotFoundError, ValidationError } from "../../src/errors.js";

async function setup() {
  const db = await createTestDb();
  const product = await addProduct(db, {
    sku: "MBP-2024",
    name: "MacBook Pro",
    price: 298000,
    cost: 200000,
  });
  const warehouseId = await seedWarehouse(db);
  return { db, product, warehouseId };
}

describe("stock alerts", () => {
  it("setStockThreshold stores a minimum quantity for a product", async () => {
    const { db, product } = await setup();
    const t = await setStockThreshold(db, {
      productId: product.id,
      minQuantity: 10,
    });
    expect(t.product_id).toBe(product.id);
    expect(t.min_quantity).toBe(10);
  });

  it("setStockThreshold upserts on the same product", async () => {
    const { db, product } = await setup();
    await setStockThreshold(db, { productId: product.id, minQuantity: 10 });
    const updated = await setStockThreshold(db, {
      productId: product.id,
      minQuantity: 20,
    });
    expect(updated.min_quantity).toBe(20);
  });

  it("setStockThreshold throws NotFoundError for unknown product", async () => {
    const db = await createTestDb();
    await expect(
      setStockThreshold(db, { productId: 999, minQuantity: 5 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("setStockThreshold rejects negative minimum", async () => {
    const { db, product } = await setup();
    await expect(
      setStockThreshold(db, { productId: product.id, minQuantity: -1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("getStockAlerts returns products whose quantity is below threshold", async () => {
    const { db, product, warehouseId } = await setup();
    await setStockThreshold(db, { productId: product.id, minQuantity: 10 });
    await stockIn(db, { productId: product.id, warehouseId, quantity: 12 });
    await stockOut(db, { productId: product.id, warehouseId, quantity: 7 });
    const alerts = await getStockAlerts(db);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      sku: "MBP-2024",
      current_quantity: 5,
      min_quantity: 10,
    });
  });

  it("getStockAlerts does NOT return products at exactly the threshold", async () => {
    const { db, product, warehouseId } = await setup();
    await setStockThreshold(db, { productId: product.id, minQuantity: 10 });
    await stockIn(db, { productId: product.id, warehouseId, quantity: 10 });
    const alerts = await getStockAlerts(db);
    expect(alerts).toHaveLength(0);
  });

  it("getStockAlerts treats zero stock (no inventory row) as below threshold", async () => {
    const { db, product } = await setup();
    await setStockThreshold(db, { productId: product.id, minQuantity: 10 });
    const alerts = await getStockAlerts(db);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].current_quantity).toBe(0);
  });

  it("getStockAlerts sums quantity across warehouses", async () => {
    const { db, product } = await setup();
    const w1 = await seedWarehouse(db, "Tokyo");
    const w2 = await seedWarehouse(db, "Osaka");
    await setStockThreshold(db, { productId: product.id, minQuantity: 10 });
    await stockIn(db, { productId: product.id, warehouseId: w1, quantity: 4 });
    await stockIn(db, { productId: product.id, warehouseId: w2, quantity: 5 });
    const alerts = await getStockAlerts(db);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].current_quantity).toBe(9);
  });
});
