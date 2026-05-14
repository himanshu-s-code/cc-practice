import { getDb } from "@/lib/db/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { calculateInventoryValue } from "@/lib/modules/accounting";

export async function GET() {
  try {
    const db = await getDb();
    const [productCount, stockTotal, value] = await Promise.all([
      db.execute(`SELECT COUNT(*) AS c FROM products`),
      db.execute(`SELECT COALESCE(SUM(quantity), 0) AS s FROM inventory`),
      calculateInventoryValue(db),
    ]);
    return successResponse({
      productCount: Number(productCount.rows[0].c),
      stockTotal: Number(stockTotal.rows[0].s),
      inventoryValue: value.totalValue,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
