import { getDb } from "@/lib/db/client";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const db = await getDb();
    // Last 7 days, including today. Group by DATE(created_at).
    const res = await db.execute(
      `SELECT DATE(created_at) AS day,
              COALESCE(SUM(total), 0) AS revenue,
              COUNT(*) AS orders
       FROM orders
       WHERE status != 'CANCELLED'
         AND DATE(created_at) >= DATE('now', '-6 days')
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
    );
    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (const r of res.rows) {
      buckets.set(String(r.day), {
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      });
    }
    const today = new Date();
    const days: { day: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const bucket = buckets.get(key) ?? { revenue: 0, orders: 0 };
      days.push({ day: key, ...bucket });
    }
    return successResponse(days);
  } catch (err) {
    return errorResponse(err);
  }
}
