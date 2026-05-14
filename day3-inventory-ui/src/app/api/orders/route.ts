import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { createOrder, listOrders } from "@/lib/modules/order";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const customerName = url.searchParams.get("customer") ?? undefined;
    if (status !== null && !STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new ValidationError(`Invalid status: ${status}`);
    }
    const db = await getDb();
    const orders = await listOrders(db, {
      status: (status as (typeof STATUSES)[number] | null) ?? undefined,
      customerName,
    });
    return successResponse(orders);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();
    const result = await createOrder(db, body);
    return successResponse(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
