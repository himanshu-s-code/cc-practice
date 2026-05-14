"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  createWarehouse,
  stockIn,
  stockOut,
} from "@/lib/modules/stock";
import {
  DuplicateError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

export interface ActionEnvelope<T> {
  data: T | null;
  error: { name: string; message: string } | null;
}

const stockMoveSchema = z.object({
  productId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().optional(),
});

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

function toClientError(err: unknown) {
  if (
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof DuplicateError ||
    err instanceof InsufficientStockError
  ) {
    return { name: err.name, message: err.message };
  }
  if (err instanceof Error) return { name: err.name, message: err.message };
  return { name: "UnknownError", message: String(err) };
}

export async function stockInAction(
  input: unknown,
): Promise<ActionEnvelope<{ id: number }>> {
  const parsed = stockMoveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    const mv = await stockIn(db, parsed.data);
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    return { data: { id: mv.id }, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}

export async function stockOutAction(
  input: unknown,
): Promise<ActionEnvelope<{ id: number }>> {
  const parsed = stockMoveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    const mv = await stockOut(db, parsed.data);
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    return { data: { id: mv.id }, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}

export async function createWarehouseAction(
  input: unknown,
): Promise<ActionEnvelope<{ id: number }>> {
  const parsed = createWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    const w = await createWarehouse(db, parsed.data);
    revalidatePath("/stock");
    return { data: { id: w.id }, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}
