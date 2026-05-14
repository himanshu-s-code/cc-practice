import "server-only";
import { z } from "zod";
import type { Client } from "@libsql/client";
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "../errors";
import {
  toInventoryRow,
  toStockMovement,
  toWarehouse,
} from "../db/mappers";
import type {
  InventoryRow,
  StockAlert,
  StockMovement,
  StockThreshold,
  Warehouse,
} from "../types";

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

const listMovementsSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    warehouseId: z.number().int().positive().optional(),
    type: z.enum(["IN", "OUT"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .optional();

export type ListMovementsFilter = z.infer<typeof listMovementsSchema>;

export interface StockMovementWithProduct extends StockMovement {
  product_sku: string;
  product_name: string;
  warehouse_name: string;
}

export async function listMovements(
  db: Client,
  filter?: ListMovementsFilter,
): Promise<StockMovementWithProduct[]> {
  const data = parse(listMovementsSchema, filter, "listMovements");
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (data?.productId !== undefined) {
    where.push("m.product_id = ?");
    args.push(data.productId);
  }
  if (data?.warehouseId !== undefined) {
    where.push("m.warehouse_id = ?");
    args.push(data.warehouseId);
  }
  if (data?.type) {
    where.push("m.type = ?");
    args.push(data.type);
  }
  if (data?.from) {
    where.push("DATE(m.created_at) >= DATE(?)");
    args.push(data.from);
  }
  if (data?.to) {
    where.push("DATE(m.created_at) <= DATE(?)");
    args.push(data.to);
  }
  const limit = data?.limit ?? 100;
  const sql = `SELECT m.*,
                      p.sku  AS product_sku,
                      p.name AS product_name,
                      w.name AS warehouse_name
               FROM stock_movements m
               JOIN products p   ON p.id = m.product_id
               JOIN warehouses w ON w.id = m.warehouse_id
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY m.id DESC
               LIMIT ${limit}`;
  const res = await db.execute({ sql, args });
  return res.rows.map((r) => ({
    id: Number(r.id),
    product_id: Number(r.product_id),
    warehouse_id: Number(r.warehouse_id),
    type: String(r.type) as "IN" | "OUT",
    quantity: Number(r.quantity),
    reference_id: r.reference_id === null ? null : Number(r.reference_id),
    note: r.note === null ? null : String(r.note),
    created_at: String(r.created_at),
    product_sku: String(r.product_sku),
    product_name: String(r.product_name),
    warehouse_name: String(r.warehouse_name),
  }));
}

const setThresholdSchema = z.object({
  productId: z.number().int().positive(),
  minQuantity: z.number().int().nonnegative(),
});

export type SetThresholdInput = z.infer<typeof setThresholdSchema>;

export async function setStockThreshold(
  db: Client,
  input: SetThresholdInput,
): Promise<StockThreshold> {
  const data = parse(setThresholdSchema, input, "setStockThreshold");
  const product = await db.execute({
    sql: `SELECT id FROM products WHERE id = ?`,
    args: [data.productId],
  });
  if (product.rows.length === 0) {
    throw new NotFoundError("Product", data.productId);
  }
  const res = await db.execute({
    sql: `INSERT INTO stock_thresholds (product_id, min_quantity)
          VALUES (?, ?)
          ON CONFLICT(product_id) DO UPDATE SET
            min_quantity = excluded.min_quantity,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
    args: [data.productId, data.minQuantity],
  });
  const row = res.rows[0];
  return {
    product_id: Number(row.product_id),
    min_quantity: Number(row.min_quantity),
    updated_at: String(row.updated_at),
  };
}

const transferSchema = z
  .object({
    productId: z.number().int().positive(),
    fromWarehouseId: z.number().int().positive(),
    toWarehouseId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })
  .refine((v) => v.fromWarehouseId !== v.toWarehouseId, {
    message: "fromWarehouseId and toWarehouseId must differ",
  });

export type TransferInput = z.infer<typeof transferSchema>;

export interface TransferResult {
  out: StockMovement;
  in: StockMovement;
}

export async function transferStock(
  db: Client,
  input: TransferInput,
): Promise<TransferResult> {
  const data = parse(transferSchema, input, "transferStock");

  const [productExists, fromExists, toExists] = await Promise.all([
    db.execute({ sql: `SELECT id FROM products WHERE id = ?`, args: [data.productId] }),
    db.execute({ sql: `SELECT id FROM warehouses WHERE id = ?`, args: [data.fromWarehouseId] }),
    db.execute({ sql: `SELECT id FROM warehouses WHERE id = ?`, args: [data.toWarehouseId] }),
  ]);
  if (productExists.rows.length === 0) throw new NotFoundError("Product", data.productId);
  if (fromExists.rows.length === 0) throw new NotFoundError("Warehouse", data.fromWarehouseId);
  if (toExists.rows.length === 0) throw new NotFoundError("Warehouse", data.toWarehouseId);

  await db.execute("BEGIN");
  try {
    const availRes = await db.execute({
      sql: `SELECT quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?`,
      args: [data.productId, data.fromWarehouseId],
    });
    const available =
      availRes.rows.length === 0 ? 0 : Number(availRes.rows[0].quantity);
    if (available < data.quantity) {
      await db.execute("ROLLBACK");
      throw new InsufficientStockError(
        data.productId,
        data.fromWarehouseId,
        data.quantity,
        available,
      );
    }

    await db.execute({
      sql: `UPDATE inventory SET quantity = quantity - ?
            WHERE product_id = ? AND warehouse_id = ?`,
      args: [data.quantity, data.productId, data.fromWarehouseId],
    });
    await db.execute({
      sql: `INSERT INTO inventory (product_id, warehouse_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(product_id, warehouse_id)
            DO UPDATE SET quantity = quantity + excluded.quantity`,
      args: [data.productId, data.toWarehouseId, data.quantity],
    });

    const outMv = await db.execute({
      sql: `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, note)
            VALUES (?, ?, 'OUT', ?, ?) RETURNING *`,
      args: [
        data.productId,
        data.fromWarehouseId,
        data.quantity,
        `Transfer to warehouse ${data.toWarehouseId}`,
      ],
    });
    const inMv = await db.execute({
      sql: `INSERT INTO stock_movements (product_id, warehouse_id, type, quantity, note)
            VALUES (?, ?, 'IN', ?, ?) RETURNING *`,
      args: [
        data.productId,
        data.toWarehouseId,
        data.quantity,
        `Transfer from warehouse ${data.fromWarehouseId}`,
      ],
    });

    await db.execute("COMMIT");
    return {
      out: toStockMovement(outMv.rows[0]),
      in: toStockMovement(inMv.rows[0]),
    };
  } catch (err) {
    try {
      await db.execute("ROLLBACK");
    } catch {
      // already rolled back / no active tx — safe to ignore
    }
    throw err;
  }
}

export async function getStockAlerts(db: Client): Promise<StockAlert[]> {
  const res = await db.execute(
    `SELECT
       p.id          AS product_id,
       p.sku         AS sku,
       p.name        AS name,
       COALESCE(SUM(i.quantity), 0) AS current_quantity,
       t.min_quantity AS min_quantity
     FROM stock_thresholds t
     JOIN products p ON p.id = t.product_id
     LEFT JOIN inventory i ON i.product_id = p.id
     GROUP BY p.id, p.sku, p.name, t.min_quantity
     HAVING current_quantity < t.min_quantity
     ORDER BY p.id`,
  );
  return res.rows.map((r) => ({
    product_id: Number(r.product_id),
    sku: String(r.sku),
    name: String(r.name),
    current_quantity: Number(r.current_quantity),
    min_quantity: Number(r.min_quantity),
  }));
}
