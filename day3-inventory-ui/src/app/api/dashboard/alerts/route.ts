import { getDb } from "@/lib/db/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getStockAlerts } from "@/lib/modules/stock";

export async function GET() {
  try {
    const db = await getDb();
    const alerts = await getStockAlerts(db);
    return successResponse(alerts);
  } catch (err) {
    return errorResponse(err);
  }
}
