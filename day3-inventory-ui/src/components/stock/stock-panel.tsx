"use client";

import { useState, useTransition } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  stockInAction,
  stockOutAction,
  createWarehouseAction,
} from "@/lib/actions/stock-actions";
import type {
  Product,
  Warehouse,
} from "@/lib/types";
import type { StockMovementWithProduct } from "@/lib/modules/stock";

interface Props {
  products: Product[];
  warehouses: Warehouse[];
  movements: StockMovementWithProduct[];
}

export function StockPanel({ products, warehouses, movements }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stock</h1>
        <p className="text-muted-foreground">
          Record stock-in, stock-out, and review movement history.
        </p>
      </div>

      <Tabs defaultValue="in">
        <TabsList>
          <TabsTrigger value="in">Stock in</TabsTrigger>
          <TabsTrigger value="out">Stock out</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="in">
          <MoveForm
            mode="in"
            products={products}
            warehouses={warehouses}
          />
        </TabsContent>
        <TabsContent value="out">
          <MoveForm
            mode="out"
            products={products}
            warehouses={warehouses}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTable movements={movements} />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehouseSection warehouses={warehouses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MoveForm({
  mode,
  products,
  warehouses,
}: {
  mode: "in" | "out";
  products: Product[];
  warehouses: Warehouse[];
}) {
  const [productId, setProductId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      if (!productId || !warehouseId || !quantity) {
        toast.error("Product, warehouse, and quantity are required");
        return;
      }
      const payload = {
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        quantity: Number(quantity),
        note: note || undefined,
      };
      const action = mode === "in" ? stockInAction : stockOutAction;
      const result = await action(payload);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(mode === "in" ? "Stocked in" : "Stocked out");
      setQuantity("");
      setNote("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "in" ? "Register stock-in" : "Register stock-out"}
        </CardTitle>
        <CardDescription>
          {mode === "in"
            ? "Add inventory for a product at a warehouse."
            : "Remove inventory; fails if quantity exceeds available stock."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Product</label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.sku} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Warehouse</label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Note (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : mode === "in" ? "Stock in" : "Stock out"}
        </Button>
      </CardContent>
    </Card>
  );
}

function HistoryTable({ movements }: { movements: StockMovementWithProduct[] }) {
  const [type, setType] = useState<string>("ALL");
  const filtered =
    type === "ALL" ? movements : movements.filter((m) => m.type === type);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Movement history</CardTitle>
          <CardDescription>Most recent first ({filtered.length})</CardDescription>
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="IN">In</SelectItem>
            <SelectItem value="OUT">Out</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No movements yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.created_at}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{m.product_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {m.product_sku}
                    </span>
                  </TableCell>
                  <TableCell>{m.warehouse_name}</TableCell>
                  <TableCell>
                    <Badge variant={m.type === "IN" ? "default" : "secondary"}>
                      {m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {m.quantity}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.note ?? "—"}
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

function WarehouseSection({ warehouses }: { warehouses: Warehouse[] }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      if (!name) {
        toast.error("Name is required");
        return;
      }
      const result = await createWarehouseAction({
        name,
        location: location || undefined,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Added warehouse: ${name}`);
      setName("");
      setLocation("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warehouses</CardTitle>
        <CardDescription>{warehouses.length} configured</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No warehouses yet — add one below.
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.id}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.location ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tokyo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Location (optional)</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="HQ"
            />
          </div>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Adding…" : "Add warehouse"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
