import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db.js";
import { addProduct } from "../../src/modules/product.js";
import {
  createWarehouse,
  getStockStatus,
  stockIn,
} from "../../src/modules/stock.js";
import { createOrder, updateOrderStatus } from "../../src/modules/order.js";
import { createCampaign } from "../../src/modules/campaign.js";
import {
  calculateInventoryValue,
  generateSalesReport,
} from "../../src/modules/accounting.js";

describe("integration: full workflow", () => {
  it("product → stockIn → campaign → order → shipping → report", async () => {
    const db = await createTestDb();

    const product = await addProduct(db, {
      sku: "WIDGET-001",
      name: "Premium Widget",
      description: "A fine widget",
      price: 100,
      cost: 60,
    });
    expect(product.id).toBeGreaterThan(0);

    const warehouse = await createWarehouse(db, {
      name: "Main",
      location: "Tokyo",
    });

    await stockIn(db, {
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: 100,
      note: "Initial stock",
    });
    const beforeOrderInv = await getStockStatus(db, product.id);
    expect(beforeOrderInv[0].quantity).toBe(100);

    const offsetDays = (days: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const campaign = await createCampaign(db, {
      name: "Launch 10%",
      discountType: "PERCENT",
      discountValue: 10,
      startDate: offsetDays(-1),
      endDate: offsetDays(7),
    });

    const { order, items } = await createOrder(db, {
      customerName: "Alice",
      warehouseId: warehouse.id,
      items: [{ productId: product.id, quantity: 5 }],
      campaignId: campaign.id,
    });
    expect(order.subtotal).toBe(500);
    expect(order.discount).toBe(50);
    expect(order.total).toBe(450);
    expect(items).toHaveLength(1);

    const afterOrderInv = await getStockStatus(db, product.id);
    expect(afterOrderInv[0].quantity).toBe(95);

    const sale = await db.execute({
      sql: `SELECT * FROM transactions WHERE type='SALE' AND reference_id = ?`,
      args: [order.id],
    });
    expect(sale.rows.length).toBe(1);
    expect(Number(sale.rows[0].amount)).toBe(450);

    const inventoryValue = await calculateInventoryValue(db);
    expect(inventoryValue.totalValue).toBe(95 * 60);

    const shipped = await updateOrderStatus(db, order.id, "SHIPPED");
    expect(shipped.order.status).toBe("SHIPPED");
    expect(shipped.shipment).not.toBeNull();
    expect(shipped.shipment?.status).toBe("SHIPPED");
    expect(shipped.shipment?.tracking_number).toMatch(/^TRK-/);

    const today = new Date().toISOString().slice(0, 10);
    const report = await generateSalesReport(db, { from: today, to: today });
    expect(report.orderCount).toBe(1);
    expect(report.totalRevenue).toBe(450);
    expect(report.totalDiscount).toBe(50);
    expect(report.byProduct[0].productId).toBe(product.id);
    expect(report.byProduct[0].unitsSold).toBe(5);
  });
});
