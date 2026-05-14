import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDb } from "../helpers/db.js";
import { listProducts, addProduct } from "../../src/modules/product.js";
import { importProductsFromCsv } from "../../src/modules/import.js";

const tempDirs: string[] = [];

function writeTempCsv(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "csv-import-"));
  tempDirs.push(dir);
  const path = join(dir, "products.csv");
  writeFileSync(path, contents);
  return path;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("CSV product import", () => {
  it("imports products from a well-formed CSV", async () => {
    const db = await createTestDb();
    const csv = [
      "sku,name,price,cost,description",
      "MBP-2024,MacBook Pro,298000,200000,Apple laptop",
      "IPH-2024,iPhone 16,140000,90000,",
    ].join("\n");
    const file = writeTempCsv(csv);

    const result = await importProductsFromCsv(db, file);
    expect(result.imported).toBe(2);
    expect(result.failed).toHaveLength(0);

    const products = await listProducts(db);
    expect(products).toHaveLength(2);
    expect(products[0].sku).toBe("MBP-2024");
    expect(products[1].description).toBeNull();
  });

  it("skips and reports rows with validation errors but imports the rest", async () => {
    const db = await createTestDb();
    const csv = [
      "sku,name,price,cost",
      "GOOD-1,Good Widget,100,50",
      ",Missing SKU,100,50",
      "BAD-PRICE,Bad Price,not-a-number,50",
    ].join("\n");
    const file = writeTempCsv(csv);

    const result = await importProductsFromCsv(db, file);
    expect(result.imported).toBe(1);
    expect(result.failed).toHaveLength(2);
    expect(result.failed[0].line).toBe(3);
    expect(result.failed[1].line).toBe(4);

    const products = await listProducts(db);
    expect(products).toHaveLength(1);
    expect(products[0].sku).toBe("GOOD-1");
  });

  it("reports duplicate-SKU rows but keeps the existing record", async () => {
    const db = await createTestDb();
    await addProduct(db, {
      sku: "EXISTING",
      name: "Existing",
      price: 1,
      cost: 1,
    });
    const csv = [
      "sku,name,price,cost",
      "EXISTING,Duplicate,2,2",
      "NEW-1,Brand New,3,3",
    ].join("\n");
    const file = writeTempCsv(csv);

    const result = await importProductsFromCsv(db, file);
    expect(result.imported).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toMatch(/already exists|duplicate/i);

    const products = await listProducts(db);
    expect(products).toHaveLength(2);
  });

  it("rejects a CSV with missing required headers", async () => {
    const db = await createTestDb();
    const file = writeTempCsv("sku,name\nA,B");
    await expect(importProductsFromCsv(db, file)).rejects.toThrow(/header/i);
  });
});
