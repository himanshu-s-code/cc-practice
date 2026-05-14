import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { listMovements } from "@/lib/modules/stock";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

function intParam(value: string | null, label: string): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Invalid ${label}: ${value}`);
  }
  return n;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    if (type !== null && type !== "IN" && type !== "OUT") {
      throw new ValidationError(`Invalid type: ${type}`);
    }
    const filter = {
      productId: intParam(url.searchParams.get("productId"), "productId"),
      warehouseId: intParam(url.searchParams.get("warehouseId"), "warehouseId"),
      type: (type as "IN" | "OUT" | null) ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: intParam(url.searchParams.get("limit"), "limit"),
    };
    const db = await getDb();
    const rows = await listMovements(db, filter);
    return successResponse(rows);
  } catch (err) {
    return errorResponse(err);
  }
}
