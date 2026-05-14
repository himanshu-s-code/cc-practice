import { getDb } from "@/lib/db/client";
import { listOrders } from "@/lib/modules/order";
import { listProducts } from "@/lib/modules/product";
import { listWarehouses } from "@/lib/modules/stock";
import { OrdersPanel } from "@/components/orders/orders-panel";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const db = await getDb();
  const [orders, products, warehouses] = await Promise.all([
    listOrders(db),
    listProducts(db),
    listWarehouses(db),
  ]);
  return (
    <main className="container mx-auto py-8 px-4">
      <OrdersPanel
        orders={orders}
        products={products}
        warehouses={warehouses}
      />
    </main>
  );
}
