export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ShipmentStatus = "PENDING" | "SHIPPED" | "DELIVERED";
export type StockMovementType = "IN" | "OUT";
export type DiscountType = "PERCENT" | "FIXED";
export type TransactionType = "SALE" | "PURCHASE" | "REFUND" | "ADJUSTMENT";

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
  created_at: string;
}

export interface InventoryRow {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  warehouse_id: number;
  type: StockMovementType;
  quantity: number;
  reference_id: number | null;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  customer_name: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  campaign_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface Shipment {
  id: number;
  order_id: number;
  status: ShipmentStatus;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  start_date: string;
  end_date: string;
  active: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  reference_id: number | null;
  reference_type: string | null;
  note: string | null;
  created_at: string;
}
