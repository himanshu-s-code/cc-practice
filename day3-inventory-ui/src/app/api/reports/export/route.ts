import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateSalesReport } from "@/lib/modules/accounting";
import { listProducts } from "@/lib/modules/product";
import { getStockStatus } from "@/lib/modules/stock";
import { errorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const db = await getDb();

    if (type === "sales") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to) {
        throw new ValidationError("from and to are required for sales export");
      }
      const report = await generateSalesReport(db, { from, to });
      const lines = [
        "sku,name,units_sold,revenue",
        ...report.byProduct.map((p) =>
          [p.sku, csvEscape(p.name), p.unitsSold, p.revenue].join(","),
        ),
      ];
      return csvResponse(lines.join("\n"), `sales-${from}-to-${to}.csv`);
    }

    if (type === "inventory") {
      const [products, stock] = await Promise.all([
        listProducts(db),
        getStockStatus(db),
      ]);
      const productMap = new Map(products.map((p) => [p.id, p]));
      const lines = [
        "sku,name,warehouse_id,quantity,cost,value",
        ...stock.map((row) => {
          const p = productMap.get(row.product_id);
          const value = p ? row.quantity * p.cost : 0;
          return [
            p?.sku ?? "",
            csvEscape(p?.name ?? ""),
            row.warehouse_id,
            row.quantity,
            p?.cost ?? 0,
            value,
          ].join(",");
        }),
      ];
      return csvResponse(lines.join("\n"), "inventory.csv");
    }

    throw new ValidationError("type must be 'sales' or 'inventory'");
  } catch (err) {
    return errorResponse(err);
  }
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvResponse(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
