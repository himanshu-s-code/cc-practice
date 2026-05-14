import { getDb } from "@/lib/db/client";
import { calculateInventoryValue } from "@/lib/modules/accounting";
import { listProducts } from "@/lib/modules/product";
import { getStockStatus } from "@/lib/modules/stock";
import { ReportsPanel } from "@/components/reports/reports-panel";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const db = await getDb();
  const [inventoryValue, products, stock] = await Promise.all([
    calculateInventoryValue(db),
    listProducts(db),
    getStockStatus(db),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const byProduct = new Map<number, { quantity: number; value: number }>();
  for (const row of stock) {
    const p = productMap.get(row.product_id);
    if (!p) continue;
    const entry = byProduct.get(row.product_id) ?? { quantity: 0, value: 0 };
    entry.quantity += row.quantity;
    entry.value += row.quantity * p.cost;
    byProduct.set(row.product_id, entry);
  }
  const productSummary = Array.from(byProduct.entries())
    .map(([id, agg]) => ({
      productId: id,
      sku: productMap.get(id)?.sku ?? "",
      name: productMap.get(id)?.name ?? "",
      quantity: agg.quantity,
      value: Math.round(agg.value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <main className="container mx-auto py-8 px-4">
      <ReportsPanel
        inventoryValue={inventoryValue.totalValue}
        productSummary={productSummary}
      />
    </main>
  );
}
