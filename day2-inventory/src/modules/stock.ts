import { z } from "zod";
import type { Client } from "@libsql/client";
import { InsufficientStockError, ValidationError } from "../errors.js";
import {
  toInventoryRow,
  toStockMovement,
  toWarehouse,
} from "../db/mappers.js";
import type { InventoryRow, StockMovement, Warehouse } from "../types.js";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export async function createWarehouse(
  db: Client,
  input: CreateWarehouseInput,
): Promise<Warehouse> {
  const data = parse(createWarehouseSchema, input, "createWarehouse");
  const res = await db.execute({
    sql: `INSERT INTO warehouses (name, location) VALUES (?, ?) RETURNING *`,
    args: [data.name, data.location ?? null],
  });
  return toWarehouse(res.rows[0]);
}

export async function listWarehouses(db: Client): Promise<Warehouse[]> {
  const res = await db.execute(`SELECT * FROM warehouses ORDER BY id ASC`);
  return res.rows.map(toWarehouse);
}

const stockInSchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
  referenceId: z.number().int().positive().optional(),
});

const stockOutSchema = stockInSchema;

export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${label} input`, result.error.issues);
  }
  return result.data;
}

async function currentQuantity(
  db: Client,
  productId: number,
  warehouseId: number,
): Promise<number> {
  const res = await db.execute({
    sql: `SELECT quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?`,
    args: [productId, warehouseId],
  });
  if (res.rows.length === 0) return 0;
  return Number(res.rows[0].quantity);
}

export async function stockIn(
  db: Client,
  input: StockInInput,
): Promise<StockMovement> {
  const data = parse(stockInSchema, input, "stockIn");
  await db.execute({
    sql: `INSERT INTO inventory (product_id, warehouse_id, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(product_id, warehouse_id)
          DO UPDATE SET quantity = quantity + excluded.quantity`,
    args: [data.productId, data.warehouseId, data.quantity],
  });
  const mv = await db.execute({
    sql: `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, reference_id, note)
          VALUES (?, ?, 'IN', ?, ?, ?) RETURNING *`,
    args: [
      data.productId,
      data.warehouseId,
      data.quantity,
      data.referenceId ?? null,
      data.note ?? null,
    ],
  });
  return toStockMovement(mv.rows[0]);
}

export async function stockOut(
  db: Client,
  input: StockOutInput,
): Promise<StockMovement> {
  const data = parse(stockOutSchema, input, "stockOut");
  const available = await currentQuantity(db, data.productId, data.warehouseId);
  if (available < data.quantity) {
    throw new InsufficientStockError(
      data.productId,
      data.warehouseId,
      data.quantity,
      available,
    );
  }
  await db.execute({
    sql: `UPDATE inventory SET quantity = quantity - ?
          WHERE product_id = ? AND warehouse_id = ?`,
    args: [data.quantity, data.productId, data.warehouseId],
  });
  const mv = await db.execute({
    sql: `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, reference_id, note)
          VALUES (?, ?, 'OUT', ?, ?, ?) RETURNING *`,
    args: [
      data.productId,
      data.warehouseId,
      data.quantity,
      data.referenceId ?? null,
      data.note ?? null,
    ],
  });
  return toStockMovement(mv.rows[0]);
}

export async function getStockStatus(
  db: Client,
  productId?: number,
): Promise<InventoryRow[]> {
  if (productId === undefined) {
    const res = await db.execute(
      `SELECT * FROM inventory ORDER BY product_id, warehouse_id`,
    );
    return res.rows.map(toInventoryRow);
  }
  const res = await db.execute({
    sql: `SELECT * FROM inventory WHERE product_id = ? ORDER BY warehouse_id`,
    args: [productId],
  });
  return res.rows.map(toInventoryRow);
}
