import "server-only";
import { z } from "zod";
import type { Client } from "@libsql/client";
import { ValidationError } from "../errors";
import { toTransaction } from "../db/mappers";
import type { Transaction, TransactionType } from "../types";

const recordTransactionSchema = z.object({
  type: z.enum(["SALE", "PURCHASE", "REFUND", "ADJUSTMENT"]),
  amount: z.number(),
  referenceId: z.number().int().positive().optional(),
  referenceType: z.string().optional(),
  note: z.string().optional(),
});

const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Expected YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Expected YYYY-MM-DD"),
});

export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;

export interface SalesReport {
  from: string;
  to: string;
  orderCount: number;
  totalRevenue: number;
  totalDiscount: number;
  byProduct: ProductSales[];
}

export interface ProductSales {
  productId: number;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
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

export async function recordTransaction(
  db: Client,
  input: RecordTransactionInput,
): Promise<Transaction> {
  const data = parse(recordTransactionSchema, input, "recordTransaction");
  const res = await db.execute({
    sql: `INSERT INTO transactions (type, amount, reference_id, reference_type, note)
          VALUES (?, ?, ?, ?, ?) RETURNING *`,
    args: [
      data.type as TransactionType,
      data.amount,
      data.referenceId ?? null,
      data.referenceType ?? null,
      data.note ?? null,
    ],
  });
  return toTransaction(res.rows[0]);
}

export async function listTransactions(db: Client): Promise<Transaction[]> {
  const res = await db.execute(
    `SELECT * FROM transactions ORDER BY id DESC`,
  );
  return res.rows.map(toTransaction);
}

export async function generateSalesReport(
  db: Client,
  range: DateRange,
): Promise<SalesReport> {
  const data = parse(dateRangeSchema, range, "generateSalesReport");

  const ordersRes = await db.execute({
    sql: `SELECT COUNT(*) AS c,
                 COALESCE(SUM(total), 0) AS revenue,
                 COALESCE(SUM(discount), 0) AS discount
          FROM orders
          WHERE status != 'CANCELLED'
            AND DATE(created_at) BETWEEN ? AND ?`,
    args: [data.from, data.to],
  });
  const summary = ordersRes.rows[0];

  const productRes = await db.execute({
    sql: `SELECT p.id AS product_id,
                 p.sku AS sku,
                 p.name AS name,
                 COALESCE(SUM(oi.quantity), 0) AS units_sold,
                 COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          WHERE o.status != 'CANCELLED'
            AND DATE(o.created_at) BETWEEN ? AND ?
          GROUP BY p.id, p.sku, p.name
          ORDER BY revenue DESC`,
    args: [data.from, data.to],
  });

  const byProduct: ProductSales[] = productRes.rows.map((r) => ({
    productId: Number(r.product_id),
    sku: String(r.sku),
    name: String(r.name),
    unitsSold: Number(r.units_sold),
    revenue: round2(Number(r.revenue)),
  }));

  return {
    from: data.from,
    to: data.to,
    orderCount: Number(summary.c),
    totalRevenue: round2(Number(summary.revenue)),
    totalDiscount: round2(Number(summary.discount)),
    byProduct,
  };
}

export async function calculateInventoryValue(
  db: Client,
): Promise<{ totalValue: number }> {
  const res = await db.execute(
    `SELECT COALESCE(SUM(i.quantity * p.cost), 0) AS value
     FROM inventory i
     JOIN products p ON p.id = i.product_id`,
  );
  return { totalValue: round2(Number(res.rows[0].value)) };
}
