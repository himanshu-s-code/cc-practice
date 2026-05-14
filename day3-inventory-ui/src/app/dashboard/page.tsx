import { getDb } from "@/lib/db/client";
import { calculateInventoryValue } from "@/lib/modules/accounting";
import { getStockAlerts, listMovements } from "@/lib/modules/stock";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = await getDb();
  const [productCount, stockTotal, value, recent, alerts, salesChart] =
    await Promise.all([
      db.execute(`SELECT COUNT(*) AS c FROM products`),
      db.execute(`SELECT COALESCE(SUM(quantity), 0) AS s FROM inventory`),
      calculateInventoryValue(db),
      listMovements(db, { limit: 10 }),
      getStockAlerts(db),
      db.execute(
        `SELECT DATE(created_at) AS day,
                COALESCE(SUM(total), 0) AS revenue,
                COUNT(*) AS orders
         FROM orders
         WHERE status != 'CANCELLED'
           AND DATE(created_at) >= DATE('now', '-6 days')
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
      ),
    ]);

  const totalProducts = Number(productCount.rows[0].c);
  const totalStock = Number(stockTotal.rows[0].s);

  return (
    <main className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Inventory at a glance — counts, alerts, and recent activity.
        </p>
      </div>

      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total products</CardDescription>
            <CardTitle className="text-3xl">{totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total stock (units)</CardDescription>
            <CardTitle className="text-3xl">{totalStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Inventory value (cost)</CardDescription>
            <CardTitle className="text-3xl">
              {value.totalValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent stock movements</CardTitle>
            <CardDescription>Last 10 in/out events</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No movements yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.created_at}
                      </TableCell>
                      <TableCell>{m.product_name}</TableCell>
                      <TableCell>{m.warehouse_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={m.type === "IN" ? "default" : "secondary"}
                        >
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {m.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low-stock alerts</CardTitle>
            <CardDescription>
              Products below their configured minimum
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No alerts — all stock above thresholds.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.product_id}>
                      <TableCell>
                        <Badge variant="destructive">{a.sku}</Badge>
                      </TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-right">
                        {a.current_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.min_quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Last 7 days — sales</CardTitle>
          <CardDescription>Daily orders &amp; revenue (excluding cancelled)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesChart.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No sales in the last 7 days.
                  </TableCell>
                </TableRow>
              ) : (
                salesChart.rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{String(r.day)}</TableCell>
                    <TableCell className="text-right">{Number(r.orders)}</TableCell>
                    <TableCell className="text-right">
                      {Number(r.revenue).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
