"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductFormDialog } from "./product-form-dialog";
import { DeleteProductButton } from "./delete-product-button";
import type { Product } from "@/lib/types";

export function ProductsTable({ products }: { products: Product[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">Products</CardTitle>
          <p className="text-sm text-muted-foreground">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add Product</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No products yet — click &ldquo;Add Product&rdquo; to create one.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant="secondary">{p.sku}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.price}</TableCell>
                  <TableCell className="text-right">{p.cost}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(p)}>
                          Edit
                        </DropdownMenuItem>
                        <DeleteProductButton id={p.id} name={p.name} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <ProductFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <ProductFormDialog
        mode="edit"
        product={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </Card>
  );
}
