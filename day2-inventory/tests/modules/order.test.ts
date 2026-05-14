import { describe, it, expect } from "vitest";
import { createTestDb, seedWarehouse } from "../helpers/db.js";
import { addProduct } from "../../src/modules/product.js";
import { stockIn } from "../../src/modules/stock.js";
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from "../../src/modules/order.js";
import { InsufficientStockError, NotFoundError } from "../../src/errors.js";

async function setup() {
  const db = await createTestDb();
  const product = await addProduct(db, {
    sku: "SKU1",
    name: "Widget",
    price: 100,
    cost: 60,
  });
  const warehouseId = await seedWarehouse(db);
  await stockIn(db, { productId: product.id, warehouseId, quantity: 100 });
  return { db, product, warehouseId };
}

describe("order module", () => {
  it("creates an order, reduces stock, and records a SALE transaction", async () => {
    const { db, product, warehouseId } = await setup();
    const { order, items } = await createOrder(db, {
      customerName: "Alice",
      warehouseId,
      items: [{ productId: product.id, quantity: 5 }],
    });
    expect(order.subtotal).toBe(500);
    expect(order.total).toBe(500);
    expect(items).toHaveLength(1);
    expect(items[0].unit_price).toBe(100);

    const txns = await db.execute(`SELECT * FROM transactions WHERE type='SALE'`);
    expect(txns.rows).toHaveLength(1);
    expect(Number(txns.rows[0].amount)).toBe(500);

    const inv = await db.execute(`SELECT quantity FROM inventory`);
    expect(Number(inv.rows[0].quantity)).toBe(95);
  });

  it("throws InsufficientStockError when stock is short", async () => {
    const { db, product, warehouseId } = await setup();
    await expect(
      createOrder(db, {
        customerName: "Bob",
        warehouseId,
        items: [{ productId: product.id, quantity: 9999 }],
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it("throws NotFoundError for unknown product", async () => {
    const { db, warehouseId } = await setup();
    await expect(
      createOrder(db, {
        customerName: "Bob",
        warehouseId,
        items: [{ productId: 999, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists orders with filtering", async () => {
    const { db, product, warehouseId } = await setup();
    await createOrder(db, {
      customerName: "Alice",
      warehouseId,
      items: [{ productId: product.id, quantity: 1 }],
    });
    await createOrder(db, {
      customerName: "Bob",
      warehouseId,
      items: [{ productId: product.id, quantity: 1 }],
    });
    const all = await listOrders(db);
    expect(all).toHaveLength(2);
    const aliceOnly = await listOrders(db, { customerName: "Alice" });
    expect(aliceOnly).toHaveLength(1);
  });

  it("updateOrderStatus to SHIPPED creates a shipment", async () => {
    const { db, product, warehouseId } = await setup();
    const { order } = await createOrder(db, {
      customerName: "Alice",
      warehouseId,
      items: [{ productId: product.id, quantity: 1 }],
    });
    const result = await updateOrderStatus(db, order.id, "SHIPPED");
    expect(result.order.status).toBe("SHIPPED");
    expect(result.shipment).not.toBeNull();
    expect(result.shipment?.tracking_number).toMatch(/^TRK-/);
  });

  it("updateOrderStatus throws for unknown order", async () => {
    const { db } = await setup();
    await expect(
      updateOrderStatus(db, 999, "SHIPPED"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getOrder returns the order", async () => {
    const { db, product, warehouseId } = await setup();
    const { order } = await createOrder(db, {
      customerName: "Alice",
      warehouseId,
      items: [{ productId: product.id, quantity: 1 }],
    });
    const fetched = await getOrder(db, order.id);
    expect(fetched.id).toBe(order.id);
  });
});
