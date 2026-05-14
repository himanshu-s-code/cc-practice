"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createOrderAction,
  updateOrderStatusAction,
} from "@/lib/actions/order-actions";
import type { Order, OrderStatus, Product, Warehouse } from "@/lib/types";

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "secondary",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

interface Props {
  orders: Order[];
  products: Product[];
  warehouses: Warehouse[];
}

export function OrdersPanel({ orders, products, warehouses }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [orders, statusFilter, search]);

  function setStatus(id: number, status: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(id, status);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Order #${id} → ${status}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            View, filter, and process customer orders.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New order</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-sm font-medium">Customer search</label>
            <Input
              placeholder="Search by customer name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    No orders match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.id}</TableCell>
                    <TableCell className="font-medium">
                      {o.customer_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[o.status]}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{o.subtotal}</TableCell>
                    <TableCell className="text-right">{o.discount}</TableCell>
                    <TableCell className="text-right font-medium">
                      {o.total}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.created_at}
                    </TableCell>
                    <TableCell className="text-right">
                      <NextStatusButton
                        status={o.status}
                        disabled={pending}
                        onChange={(s) => setStatus(o.id, s)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewOrderDialog
        open={creating}
        onOpenChange={setCreating}
        products={products}
        warehouses={warehouses}
      />
    </div>
  );
}

function NextStatusButton({
  status,
  disabled,
  onChange,
}: {
  status: OrderStatus;
  disabled: boolean;
  onChange: (s: OrderStatus) => void;
}) {
  if (status === "PENDING") {
    return (
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange("PAID")}>
        Mark paid
      </Button>
    );
  }
  if (status === "PAID") {
    return (
      <Button size="sm" disabled={disabled} onClick={() => onChange("SHIPPED")}>
        Ship
      </Button>
    );
  }
  if (status === "SHIPPED") {
    return (
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange("DELIVERED")}>
        Mark delivered
      </Button>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

interface LineItem {
  productId: string;
  quantity: string;
}

function NewOrderDialog({
  open,
  onOpenChange,
  products,
  warehouses,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  warehouses: Warehouse[];
}) {
  const [customer, setCustomer] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: "1" }]);
  const [pending, startTransition] = useTransition();

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  const total = useMemo(() => {
    let s = 0;
    for (const it of items) {
      const p = productMap.get(Number(it.productId));
      if (p) s += p.price * Number(it.quantity || 0);
    }
    return Math.round(s * 100) / 100;
  }, [items, productMap]);

  function reset() {
    setCustomer("");
    setWarehouseId("");
    setItems([{ productId: "", quantity: "1" }]);
  }

  function submit() {
    startTransition(async () => {
      if (!customer || !warehouseId) {
        toast.error("Customer and warehouse are required");
        return;
      }
      const cleaned = items
        .filter((i) => i.productId && i.quantity)
        .map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        }));
      if (cleaned.length === 0) {
        toast.error("At least one line item is required");
        return;
      }
      const result = await createOrderAction({
        customerName: customer,
        warehouseId: Number(warehouseId),
        items: cleaned,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Created order #${result.data!.orderId}`);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>
            Create an order. Stock is deducted from the selected warehouse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Customer name</label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="テスト太郎"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Warehouse</label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Line items</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setItems([...items, { productId: "", quantity: "1" }])
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[120px]">Quantity</TableHead>
                  <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const product = productMap.get(Number(it.productId));
                  const subtotal = product
                    ? product.price * Number(it.quantity || 0)
                    : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={it.productId}
                          onValueChange={(v) => {
                            const copy = [...items];
                            copy[idx] = { ...copy[idx], productId: v };
                            setItems(copy);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.sku} — {p.name} ({p.price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx] = { ...copy[idx], quantity: e.target.value };
                            setItems(copy);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">{subtotal}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (items.length === 1) return;
                            setItems(items.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end font-medium">Total: {total}</div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Creating…" : "Create order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
