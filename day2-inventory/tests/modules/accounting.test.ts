import { describe, it, expect } from "vitest";
import { createTestDb, seedWarehouse } from "../helpers/db.js";
import { addProduct } from "../../src/modules/product.js";
import { stockIn } from "../../src/modules/stock.js";
import { createOrder } from "../../src/modules/order.js";
import {
  calculateInventoryValue,
  generateSalesReport,
  recordTransaction,
} from "../../src/modules/accounting.js";
import { ValidationError } from "../../src/errors.js";

describe("accounting module", () => {
  it("records a transaction", async () => {
    const db = await createTestDb();
    const t = await recordTransaction(db, {
      type: "PURCHASE",
      amount: 100,
      note: "stock purchase",
    });
    expect(t.id).toBeGreaterThan(0);
    expect(t.type).toBe("PURCHASE");
  });

  it("rejects invalid transaction type", async () => {
    const db = await createTestDb();
    await expect(
      recordTransaction(db, {
        type: "FOO" as never,
        amount: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("calculates inventory value", async () => {
    const db = await createTestDb();
    const p = await addProduct(db, {
      sku: "SKU1",
      name: "Widget",
      price: 100,
      cost: 60,
    });
    const warehouseId = await seedWarehouse(db);
    await stockIn(db, { productId: p.id, warehouseId, quantity: 10 });
    const v = await calculateInventoryValue(db);
    expect(v.totalValue).toBe(600);
  });

  it("generates a sales report covering created orders", async () => {
    const db = await createTestDb();
    const p = await addProduct(db, {
      sku: "SKU1",
      name: "Widget",
      price: 100,
      cost: 60,
    });
    const warehouseId = await seedWarehouse(db);
    await stockIn(db, { productId: p.id, warehouseId, quantity: 10 });
    await createOrder(db, {
      customerName: "Alice",
      warehouseId,
      items: [{ productId: p.id, quantity: 2 }],
    });
    const today = new Date().toISOString().slice(0, 10);
    const report = await generateSalesReport(db, { from: today, to: today });
    expect(report.orderCount).toBe(1);
    expect(report.totalRevenue).toBe(200);
    expect(report.byProduct).toHaveLength(1);
    expect(report.byProduct[0].unitsSold).toBe(2);
    expect(report.byProduct[0].revenue).toBe(200);
  });

  it("rejects invalid date format", async () => {
    const db = await createTestDb();
    await expect(
      generateSalesReport(db, { from: "bad", to: "bad" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
