import { getDb } from "@/lib/db/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { listMovements } from "@/lib/modules/stock";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await listMovements(db, { limit: 10 });
    return successResponse(rows);
  } catch (err) {
    return errorResponse(err);
  }
}
