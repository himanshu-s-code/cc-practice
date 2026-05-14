import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateSalesReport } from "@/lib/modules/accounting";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to) {
      throw new ValidationError("from and to query params are required (YYYY-MM-DD)");
    }
    const db = await getDb();
    const report = await generateSalesReport(db, { from, to });
    return successResponse(report);
  } catch (err) {
    return errorResponse(err);
  }
}
