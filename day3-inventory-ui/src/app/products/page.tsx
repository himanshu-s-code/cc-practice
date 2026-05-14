import { getDb } from "@/lib/db/client";
import { listProducts } from "@/lib/modules/product";
import { ProductsTable } from "@/components/products/products-table";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const db = await getDb();
  const products = await listProducts(db);
  return (
    <main className="container mx-auto py-8">
      <ProductsTable products={products} />
    </main>
  );
}
