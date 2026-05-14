import "server-only";
import type { Row } from "@libsql/client";
import type {
  Campaign,
  InventoryRow,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Shipment,
  ShipmentStatus,
  StockMovement,
  StockMovementType,
  Transaction,
  TransactionType,
  Warehouse,
  DiscountType,
} from "../types";

const num = (v: unknown): number => Number(v);
const str = (v: unknown): string => String(v);
const nullableStr = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);
const nullableNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

export function toProduct(r: Row): Product {
  return {
    id: num(r.id),
    sku: str(r.sku),
    name: str(r.name),
    description: nullableStr(r.description),
    price: num(r.price),
    cost: num(r.cost),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function toWarehouse(r: Row): Warehouse {
  return {
    id: num(r.id),
    name: str(r.name),
    location: nullableStr(r.location),
    created_at: str(r.created_at),
  };
}

export function toInventoryRow(r: Row): InventoryRow {
  return {
    id: num(r.id),
    product_id: num(r.product_id),
    warehouse_id: num(r.warehouse_id),
    quantity: num(r.quantity),
  };
}

export function toStockMovement(r: Row): StockMovement {
  return {
    id: num(r.id),
    product_id: num(r.product_id),
    warehouse_id: num(r.warehouse_id),
    type: str(r.type) as StockMovementType,
    quantity: num(r.quantity),
    reference_id: nullableNum(r.reference_id),
    note: nullableStr(r.note),
    created_at: str(r.created_at),
  };
}

export function toOrder(r: Row): Order {
  return {
    id: num(r.id),
    customer_name: str(r.customer_name),
    status: str(r.status) as OrderStatus,
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    total: num(r.total),
    campaign_id: nullableNum(r.campaign_id),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function toOrderItem(r: Row): OrderItem {
  return {
    id: num(r.id),
    order_id: num(r.order_id),
    product_id: num(r.product_id),
    quantity: num(r.quantity),
    unit_price: num(r.unit_price),
  };
}

export function toShipment(r: Row): Shipment {
  return {
    id: num(r.id),
    order_id: num(r.order_id),
    status: str(r.status) as ShipmentStatus,
    tracking_number: nullableStr(r.tracking_number),
    shipped_at: nullableStr(r.shipped_at),
    delivered_at: nullableStr(r.delivered_at),
    created_at: str(r.created_at),
  };
}

export function toCampaign(r: Row): Campaign {
  return {
    id: num(r.id),
    name: str(r.name),
    discount_type: str(r.discount_type) as DiscountType,
    discount_value: num(r.discount_value),
    start_date: str(r.start_date),
    end_date: str(r.end_date),
    active: num(r.active),
    created_at: str(r.created_at),
  };
}

export function toTransaction(r: Row): Transaction {
  return {
    id: num(r.id),
    type: str(r.type) as TransactionType,
    amount: num(r.amount),
    reference_id: nullableNum(r.reference_id),
    reference_type: nullableStr(r.reference_type),
    note: nullableStr(r.note),
    created_at: str(r.created_at),
  };
}
