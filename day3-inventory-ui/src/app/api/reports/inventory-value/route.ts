import { getDb } from "@/lib/db/client";
import { calculateInventoryValue } from "@/lib/modules/accounting";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const db = await getDb();
    const result = await calculateInventoryValue(db);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
