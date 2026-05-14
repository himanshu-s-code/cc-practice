import { readFile } from "node:fs/promises";
import type { Client } from "@libsql/client";
import { DuplicateError, ValidationError } from "../errors.js";
import { addProduct } from "./product.js";

export interface ImportFailure {
  line: number;
  reason: string;
}

export interface ImportResult {
  imported: number;
  failed: ImportFailure[];
}

const REQUIRED_HEADERS = ["sku", "name", "price", "cost"] as const;

export async function importProductsFromCsv(
  db: Client,
  filePath: string,
): Promise<ImportResult> {
  const raw = await readFile(filePath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    throw new ValidationError("CSV file is empty");
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of REQUIRED_HEADERS) {
    if (!header.includes(required)) {
      throw new ValidationError(`CSV header missing required column: ${required}`);
    }
  }

  const idx = (name: string): number => header.indexOf(name);
  const skuI = idx("sku");
  const nameI = idx("name");
  const priceI = idx("price");
  const costI = idx("cost");
  const descI = idx("description");

  const result: ImportResult = { imported: 0, failed: [] };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 1;
    const sku = (row[skuI] ?? "").trim();
    const name = (row[nameI] ?? "").trim();
    const priceStr = (row[priceI] ?? "").trim();
    const costStr = (row[costI] ?? "").trim();
    const description =
      descI >= 0 && (row[descI] ?? "").trim() !== ""
        ? row[descI].trim()
        : undefined;

    const price = Number(priceStr);
    const cost = Number(costStr);
    if (!Number.isFinite(price) || !Number.isFinite(cost)) {
      result.failed.push({
        line: lineNumber,
        reason: `Invalid number: price='${priceStr}' cost='${costStr}'`,
      });
      continue;
    }

    try {
      await addProduct(db, { sku, name, description, price, cost });
      result.imported++;
    } catch (err) {
      if (err instanceof ValidationError || err instanceof DuplicateError) {
        result.failed.push({ line: lineNumber, reason: err.message });
        continue;
      }
      throw err;
    }
  }

  return result;
}

function parseCsv(input: string): string[][] {
  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.length > 0);
  return lines.map((line) => line.split(","));
}
