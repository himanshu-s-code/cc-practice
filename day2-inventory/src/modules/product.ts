import { z } from "zod";
import type { Client } from "@libsql/client";
import { DuplicateError, NotFoundError, ValidationError } from "../errors.js";
import { toProduct } from "../db/mappers.js";
import type { Product } from "../types.js";

const addProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

const updateProductSchema = z
  .object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    price: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export type AddProductInput = z.infer<typeof addProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${label} input`, result.error.issues);
  }
  return result.data;
}

export async function addProduct(
  db: Client,
  input: AddProductInput,
): Promise<Product> {
  const data = parse(addProductSchema, input, "addProduct");
  try {
    const res = await db.execute({
      sql: `INSERT INTO products (sku, name, description, price, cost)
            VALUES (?, ?, ?, ?, ?) RETURNING *`,
      args: [data.sku, data.name, data.description ?? null, data.price, data.cost],
    });
    return toProduct(res.rows[0]);
  } catch (err) {
    if (isUniqueSkuViolation(err)) {
      throw new DuplicateError("Product", "sku", data.sku);
    }
    throw err;
  }
}

function isUniqueSkuViolation(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /UNIQUE constraint failed: products\.sku/i.test(err.message);
}

export async function listProducts(db: Client): Promise<Product[]> {
  const res = await db.execute(`SELECT * FROM products ORDER BY id ASC`);
  return res.rows.map(toProduct);
}

export async function getProduct(db: Client, id: number): Promise<Product> {
  const res = await db.execute({
    sql: `SELECT * FROM products WHERE id = ?`,
    args: [id],
  });
  if (res.rows.length === 0) throw new NotFoundError("Product", id);
  return toProduct(res.rows[0]);
}

export async function updateProduct(
  db: Client,
  id: number,
  patch: UpdateProductInput,
): Promise<Product> {
  const data = parse(updateProductSchema, patch, "updateProduct");
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(data)) {
    sets.push(`${key} = ?`);
    args.push(value as string | number | null);
  }
  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  args.push(id);
  let res;
  try {
    res = await db.execute({
      sql: `UPDATE products SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
      args,
    });
  } catch (err) {
    if (isUniqueSkuViolation(err) && data.sku !== undefined) {
      throw new DuplicateError("Product", "sku", data.sku);
    }
    throw err;
  }
  if (res.rows.length === 0) throw new NotFoundError("Product", id);
  return toProduct(res.rows[0]);
}

export async function deleteProduct(db: Client, id: number): Promise<void> {
  const res = await db.execute({
    sql: `DELETE FROM products WHERE id = ?`,
    args: [id],
  });
  if (res.rowsAffected === 0) throw new NotFoundError("Product", id);
}
