import "server-only";
import type { Client } from "@libsql/client";

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS products (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     sku TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     description TEXT,
     price REAL NOT NULL CHECK (price >= 0),
     cost REAL NOT NULL CHECK (cost >= 0),
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS warehouses (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     location TEXT,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS inventory (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
     quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
     UNIQUE (product_id, warehouse_id)
   )`,
  `CREATE TABLE IF NOT EXISTS stock_movements (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     product_id INTEGER NOT NULL REFERENCES products(id),
     warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
     type TEXT NOT NULL CHECK (type IN ('IN','OUT')),
     quantity INTEGER NOT NULL CHECK (quantity > 0),
     reference_id INTEGER,
     note TEXT,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS orders (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     customer_name TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'PENDING'
       CHECK (status IN ('PENDING','PAID','SHIPPED','DELIVERED','CANCELLED')),
     subtotal REAL NOT NULL DEFAULT 0,
     discount REAL NOT NULL DEFAULT 0,
     total REAL NOT NULL DEFAULT 0,
     campaign_id INTEGER REFERENCES campaigns(id),
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS order_items (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     product_id INTEGER NOT NULL REFERENCES products(id),
     quantity INTEGER NOT NULL CHECK (quantity > 0),
     unit_price REAL NOT NULL CHECK (unit_price >= 0)
   )`,
  `CREATE TABLE IF NOT EXISTS shipments (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'PENDING'
       CHECK (status IN ('PENDING','SHIPPED','DELIVERED')),
     tracking_number TEXT,
     shipped_at TEXT,
     delivered_at TEXT,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
     discount_value REAL NOT NULL CHECK (discount_value >= 0),
     start_date TEXT NOT NULL,
     end_date TEXT NOT NULL,
     active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS stock_thresholds (
     product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
     min_quantity INTEGER NOT NULL CHECK (min_quantity >= 0),
     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS transactions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     type TEXT NOT NULL CHECK (type IN ('SALE','PURCHASE','REFUND','ADJUSTMENT')),
     amount REAL NOT NULL,
     reference_id INTEGER,
     reference_type TEXT,
     note TEXT,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
];

export async function initSchema(db: Client): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
  for (const sql of STATEMENTS) {
    await db.execute(sql);
  }
}
