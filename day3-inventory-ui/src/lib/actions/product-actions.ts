"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  addProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/modules/product";
import {
  DuplicateError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type { Product } from "@/lib/types";

export interface ActionEnvelope<T> {
  data: T | null;
  error: { name: string; message: string } | null;
}

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative(),
});

const updateSchema = z
  .object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.coerce.number().nonnegative().optional(),
    cost: z.coerce.number().nonnegative().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export async function createProductAction(
  input: unknown,
): Promise<ActionEnvelope<Product>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    const product = await addProduct(db, parsed.data);
    revalidatePath("/products");
    return { data: product, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}

export async function updateProductAction(
  id: number,
  input: unknown,
): Promise<ActionEnvelope<Product>> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    const product = await updateProduct(db, id, parsed.data);
    revalidatePath("/products");
    return { data: product, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}

const idSchema = z.number().int().positive();

export async function deleteProductAction(
  id: number,
): Promise<ActionEnvelope<{ deleted: true }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    await deleteProduct(db, parsed.data);
    revalidatePath("/products");
    return { data: { deleted: true }, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}

function toClientError(err: unknown) {
  if (
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof DuplicateError
  ) {
    return { name: err.name, message: err.message };
  }
  if (err instanceof Error) return { name: err.name, message: err.message };
  return { name: "UnknownError", message: String(err) };
}
