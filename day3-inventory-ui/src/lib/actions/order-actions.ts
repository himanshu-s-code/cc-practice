"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { createOrder, updateOrderStatus } from "@/lib/modules/order";
import {
  DuplicateError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type { OrderStatus } from "@/lib/types";

export interface ActionEnvelope<T> {
  data: T | null;
  error: { name: string; message: string } | null;
}

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1),
  warehouseId: z.coerce.number().int().positive(),
  items: z.array(orderItemSchema).min(1),
  campaignId: z.coerce.number().int().positive().optional(),
});

const statusSchema = z.enum([
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

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

export async function createOrderAction(
  input: unknown,
): Promise<ActionEnvelope<{ orderId: number }>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { name: "ValidationError", message: parsed.error.message },
    };
  }
  try {
    const db = await getDb();
    const result = await createOrder(db, parsed.data);
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/stock");
    return { data: { orderId: result.order.id }, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}

export async function updateOrderStatusAction(
  id: number,
  status: OrderStatus,
): Promise<ActionEnvelope<{ id: number; status: OrderStatus }>> {
  const idParsed = z.number().int().positive().safeParse(id);
  const statusParsed = statusSchema.safeParse(status);
  if (!idParsed.success || !statusParsed.success) {
    return {
      data: null,
      error: {
        name: "ValidationError",
        message: "Invalid id or status",
      },
    };
  }
  try {
    const db = await getDb();
    const { order } = await updateOrderStatus(db, idParsed.data, statusParsed.data);
    revalidatePath("/orders");
    return { data: { id: order.id, status: order.status }, error: null };
  } catch (err) {
    return { data: null, error: toClientError(err) };
  }
}
