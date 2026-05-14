"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createProductAction,
  updateProductAction,
} from "@/lib/actions/product-actions";
import type { Product } from "@/lib/types";

const formSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative("Price must be ≥ 0"),
  cost: z.coerce.number().nonnegative("Cost must be ≥ 0"),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface Props {
  mode: "create" | "edit";
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductFormDialog({ mode, product, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      price: 0,
      cost: 0,
    },
  });

  useEffect(() => {
    if (open && mode === "edit" && product) {
      form.reset({
        sku: product.sku,
        name: product.name,
        description: product.description ?? "",
        price: product.price,
        cost: product.cost,
      });
    } else if (open && mode === "create") {
      form.reset({ sku: "", name: "", description: "", price: 0, cost: 0 });
    }
  }, [open, mode, product, form]);

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProductAction(values)
          : await updateProductAction(product!.id, values);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(mode === "create" ? "Product created" : "Product updated");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Product" : `Edit ${product?.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new product in the catalog."
              : "Update product details."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MBP-2024" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MacBook Pro" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        ref={field.ref}
                        value={
                          field.value === undefined || field.value === null
                            ? ""
                            : String(field.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        ref={field.ref}
                        value={
                          field.value === undefined || field.value === null
                            ? ""
                            : String(field.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
