"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductSummaryRow {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  value: number;
}

interface SalesReport {
  from: string;
  to: string;
  orderCount: number;
  totalRevenue: number;
  totalDiscount: number;
  byProduct: {
    productId: number;
    sku: string;
    name: string;
    unitsSold: number;
    revenue: number;
  }[];
}

export function ReportsPanel({
  inventoryValue,
  productSummary,
}: {
  inventoryValue: number;
  productSummary: ProductSummaryRow[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Sales analytics, inventory valuation, and CSV export.
        </p>
      </div>
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory valuation</TabsTrigger>
          <TabsTrigger value="export">Export (CSV)</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <SalesReportSection />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryValuationSection
            totalValue={inventoryValue}
            rows={productSummary}
          />
        </TabsContent>
        <TabsContent value="export">
          <ExportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function SalesReportSection() {
  const [from, setFrom] = useState<string>(daysAgo(30));
  const [to, setTo] = useState<string>(today());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      const body = await res.json();
      if (body.error) {
        toast.error(body.error.message);
        setReport(null);
      } else {
        setReport(body.data as SalesReport);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales report</CardTitle>
        <CardDescription>Pick a date range and run.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run report"}
          </Button>
        </div>
        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Orders" value={report.orderCount} />
              <Stat label="Revenue" value={report.totalRevenue.toLocaleString()} />
              <Stat label="Discounts" value={report.totalDiscount.toLocaleString()} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Units sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byProduct.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No sales in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.byProduct.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{p.unitsSold}</TableCell>
                      <TableCell className="text-right">
                        {p.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InventoryValuationSection({
  totalValue,
  rows,
}: {
  totalValue: number;
  rows: ProductSummaryRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory valuation</CardTitle>
        <CardDescription>Quantities × cost across all warehouses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Stat label="Total inventory value" value={totalValue.toLocaleString()} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No stock on hand.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.productId}>
                  <TableCell>{r.sku}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className="text-right">
                    {r.value.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExportSection() {
  const [from, setFrom] = useState<string>(daysAgo(30));
  const [to, setTo] = useState<string>(today());
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
        <CardDescription>
          Download data as CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button asChild>
            <a
              href={`/api/reports/export?type=sales&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
            >
              Sales CSV
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/reports/export?type=inventory">Inventory CSV</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
