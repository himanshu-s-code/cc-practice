import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getStockStatus } from "@/lib/modules/stock";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productIdParam = url.searchParams.get("productId");
    let productId: number | undefined;
    if (productIdParam !== null) {
      const n = Number.parseInt(productIdParam, 10);
      if (!Number.isInteger(n) || n <= 0) {
        throw new ValidationError(`Invalid productId: ${productIdParam}`);
      }
      productId = n;
    }
    const db = await getDb();
    const rows = await getStockStatus(db, productId);
    return successResponse(rows);
  } catch (err) {
    return errorResponse(err);
  }
}
