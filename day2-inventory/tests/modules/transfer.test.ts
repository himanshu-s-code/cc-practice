import { describe, it, expect } from "vitest";
import { createTestDb, seedWarehouse } from "../helpers/db.js";
import { addProduct } from "../../src/modules/product.js";
import {
  getStockStatus,
  stockIn,
  transferStock,
} from "../../src/modules/stock.js";
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "../../src/errors.js";

async function setup() {
  const db = await createTestDb();
  const product = await addProduct(db, {
    sku: "MBP-2024",
    name: "MacBook Pro",
    price: 298000,
    cost: 200000,
  });
  const tokyo = await seedWarehouse(db, "Tokyo");
  const osaka = await seedWarehouse(db, "Osaka");
  await stockIn(db, { productId: product.id, warehouseId: tokyo, quantity: 10 });
  return { db, product, tokyo, osaka };
}

describe("stock transfer", () => {
  it("moves quantity from one warehouse to another", async () => {
    const { db, product, tokyo, osaka } = await setup();
    const result = await transferStock(db, {
      productId: product.id,
      fromWarehouseId: tokyo,
      toWarehouseId: osaka,
      quantity: 4,
    });
    expect(result.out.quantity).toBe(4);
    expect(result.in.quantity).toBe(4);

    const status = await getStockStatus(db, product.id);
    const byWarehouse = Object.fromEntries(
      status.map((r) => [r.warehouse_id, r.quantity]),
    );
    expect(byWarehouse[tokyo]).toBe(6);
    expect(byWarehouse[osaka]).toBe(4);
  });

  it("throws InsufficientStockError and rolls back when source is short", async () => {
    const { db, product, tokyo, osaka } = await setup();
    await expect(
      transferStock(db, {
        productId: product.id,
        fromWarehouseId: tokyo,
        toWarehouseId: osaka,
        quantity: 9999,
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const status = await getStockStatus(db, product.id);
    const byWarehouse = Object.fromEntries(
      status.map((r) => [r.warehouse_id, r.quantity]),
    );
    expect(byWarehouse[tokyo]).toBe(10);
    expect(byWarehouse[osaka] ?? 0).toBe(0);

    const movements = await db.execute(
      `SELECT COUNT(*) AS n FROM stock_movements`,
    );
    expect(Number(movements.rows[0].n)).toBe(1);
  });

  it("throws NotFoundError when destination warehouse does not exist", async () => {
    const { db, product, tokyo } = await setup();
    await expect(
      transferStock(db, {
        productId: product.id,
        fromWarehouseId: tokyo,
        toWarehouseId: 9999,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const status = await getStockStatus(db, product.id);
    expect(status[0].quantity).toBe(10);
  });

  it("rejects transfer when from === to", async () => {
    const { db, product, tokyo } = await setup();
    await expect(
      transferStock(db, {
        productId: product.id,
        fromWarehouseId: tokyo,
        toWarehouseId: tokyo,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
