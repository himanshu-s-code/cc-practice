import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getOrder, updateOrderStatus } from "@/lib/modules/order";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

function parseId(idStr: string): number {
  const n = Number.parseInt(idStr, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Invalid id: ${idStr}`);
  }
  return n;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const db = await getDb();
    const order = await getOrder(db, id);
    return successResponse(order);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const body = (await req.json()) as { status?: string };
    if (!body.status || !STATUSES.includes(body.status as OrderStatus)) {
      throw new ValidationError(`status must be one of: ${STATUSES.join(", ")}`);
    }
    const db = await getDb();
    const result = await updateOrderStatus(db, id, body.status as OrderStatus);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
