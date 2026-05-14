import { getDb } from "@/lib/db/client";
import { listProducts } from "@/lib/modules/product";
import { listMovements, listWarehouses } from "@/lib/modules/stock";
import { StockPanel } from "@/components/stock/stock-panel";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const db = await getDb();
  const [products, warehouses, movements] = await Promise.all([
    listProducts(db),
    listWarehouses(db),
    listMovements(db, { limit: 100 }),
  ]);
  return (
    <main className="container mx-auto py-8 px-4">
      <StockPanel
        products={products}
        warehouses={warehouses}
        movements={movements}
      />
    </main>
  );
}
