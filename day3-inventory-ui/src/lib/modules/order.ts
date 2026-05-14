import "server-only";
import { z } from "zod";
import type { Client } from "@libsql/client";
import { NotFoundError, ValidationError } from "../errors";
import {
  toOrder,
  toOrderItem,
  toShipment,
} from "../db/mappers";
import type { Order, OrderItem, OrderStatus, Shipment } from "../types";
import { stockOut } from "./stock";
import { applyCampaign } from "./campaign";
import { recordTransaction } from "./accounting";

const orderItemInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1),
  warehouseId: z.number().int().positive(),
  items: z.array(orderItemInputSchema).min(1),
  campaignId: z.number().int().positive().optional(),
});

const orderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

const listOrdersSchema = z
  .object({
    status: orderStatusSchema.optional(),
    customerName: z.string().optional(),
  })
  .optional();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersFilter = z.infer<typeof listOrdersSchema>;

export interface CreateOrderResult {
  order: Order;
  items: OrderItem[];
}

function parse<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${label} input`, result.error.issues);
  }
  return result.data;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createOrder(
  db: Client,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const data = parse(createOrderSchema, input, "createOrder");

  const productIds = data.items.map((i) => i.productId);
  const placeholders = productIds.map(() => "?").join(",");
  const pricesRes = await db.execute({
    sql: `SELECT id, price FROM products WHERE id IN (${placeholders})`,
    args: productIds,
  });
  const priceMap = new Map<number, number>();
  for (const row of pricesRes.rows) {
    priceMap.set(Number(row.id), Number(row.price));
  }
  for (const item of data.items) {
    if (!priceMap.has(item.productId)) {
      throw new NotFoundError("Product", item.productId);
    }
  }

  let subtotal = 0;
  for (const item of data.items) {
    subtotal += (priceMap.get(item.productId) ?? 0) * item.quantity;
  }
  subtotal = round2(subtotal);

  let discount = 0;
  let total = subtotal;
  if (data.campaignId !== undefined) {
    const applied = await applyCampaign(db, data.campaignId, subtotal);
    discount = applied.discount;
    total = applied.total;
  }

  const orderRes = await db.execute({
    sql: `INSERT INTO orders (customer_name, status, subtotal, discount, total, campaign_id)
          VALUES (?, 'PENDING', ?, ?, ?, ?) RETURNING *`,
    args: [
      data.customerName,
      subtotal,
      discount,
      total,
      data.campaignId ?? null,
    ],
  });
  const order = toOrder(orderRes.rows[0]);

  const items: OrderItem[] = [];
  for (const item of data.items) {
    const unitPrice = priceMap.get(item.productId) ?? 0;
    const itemRes = await db.execute({
      sql: `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?) RETURNING *`,
      args: [order.id, item.productId, item.quantity, unitPrice],
    });
    items.push(toOrderItem(itemRes.rows[0]));

    await stockOut(db, {
      productId: item.productId,
      warehouseId: data.warehouseId,
      quantity: item.quantity,
      referenceId: order.id,
      note: `Order #${order.id}`,
    });
  }

  await recordTransaction(db, {
    type: "SALE",
    amount: total,
    referenceId: order.id,
    referenceType: "order",
    note: `Order #${order.id} for ${data.customerName}`,
  });

  return { order, items };
}

export async function listOrders(
  db: Client,
  filter?: ListOrdersFilter,
): Promise<Order[]> {
  const data = parse(listOrdersSchema, filter, "listOrders");
  const clauses: string[] = [];
  const args: (string | number)[] = [];
  if (data?.status) {
    clauses.push(`status = ?`);
    args.push(data.status);
  }
  if (data?.customerName) {
    clauses.push(`customer_name = ?`);
    args.push(data.customerName);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const res = await db.execute({
    sql: `SELECT * FROM orders ${where} ORDER BY id DESC`,
    args,
  });
  return res.rows.map(toOrder);
}

export async function getOrder(db: Client, id: number): Promise<Order> {
  const res = await db.execute({
    sql: `SELECT * FROM orders WHERE id = ?`,
    args: [id],
  });
  if (res.rows.length === 0) throw new NotFoundError("Order", id);
  return toOrder(res.rows[0]);
}

export async function updateOrderStatus(
  db: Client,
  id: number,
  status: OrderStatus,
): Promise<{ order: Order; shipment: Shipment | null }> {
  const parsedStatus = orderStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    throw new ValidationError(
      "Invalid order status",
      parsedStatus.error.issues,
    );
  }
  const res = await db.execute({
    sql: `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? RETURNING *`,
    args: [parsedStatus.data, id],
  });
  if (res.rows.length === 0) throw new NotFoundError("Order", id);
  const order = toOrder(res.rows[0]);

  let shipment: Shipment | null = null;
  if (parsedStatus.data === "SHIPPED") {
    const existing = await db.execute({
      sql: `SELECT * FROM shipments WHERE order_id = ?`,
      args: [id],
    });
    if (existing.rows.length === 0) {
      const tracking = `TRK-${id}-${Date.now()}`;
      const shipRes = await db.execute({
        sql: `INSERT INTO shipments (order_id, status, tracking_number, shipped_at)
              VALUES (?, 'SHIPPED', ?, CURRENT_TIMESTAMP) RETURNING *`,
        args: [id, tracking],
      });
      shipment = toShipment(shipRes.rows[0]);
    } else {
      const updated = await db.execute({
        sql: `UPDATE shipments SET status = 'SHIPPED', shipped_at = CURRENT_TIMESTAMP
              WHERE order_id = ? RETURNING *`,
        args: [id],
      });
      shipment = toShipment(updated.rows[0]);
    }
  } else if (parsedStatus.data === "DELIVERED") {
    const updated = await db.execute({
      sql: `UPDATE shipments SET status = 'DELIVERED', delivered_at = CURRENT_TIMESTAMP
            WHERE order_id = ? RETURNING *`,
      args: [id],
    });
    if (updated.rows.length > 0) shipment = toShipment(updated.rows[0]);
  }

  return { order, shipment };
}
