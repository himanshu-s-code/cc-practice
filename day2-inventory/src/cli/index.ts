#!/usr/bin/env node
import { Command } from "commander";
import { createDbClient } from "../db/client.js";
import { initSchema } from "../db/schema.js";
import {
  addProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "../modules/product.js";
import {
  createWarehouse,
  getStockStatus,
  listWarehouses,
  stockIn,
  stockOut,
} from "../modules/stock.js";
import {
  createOrder,
  listOrders,
  updateOrderStatus,
} from "../modules/order.js";
import {
  applyCampaign,
  createCampaign,
  listCampaigns,
} from "../modules/campaign.js";
import {
  calculateInventoryValue,
  generateSalesReport,
  listTransactions,
  recordTransaction,
} from "../modules/accounting.js";
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "../errors.js";

const DB_URL = process.env.DB_URL ?? "file:inventory.db";

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function parseInteger(value: string, label: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`${label} must be a positive integer`);
  }
  return n;
}

function parseFloatStrict(value: string, label: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${label} must be a number`);
  }
  return n;
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("inventory")
    .description("CLI Inventory Management System")
    .version("1.0.0");

  const product = program.command("product").description("Manage products");
  product
    .command("add")
    .requiredOption("--sku <sku>")
    .requiredOption("--name <name>")
    .option("--description <desc>")
    .requiredOption("--price <price>", "Selling price")
    .requiredOption("--cost <cost>", "Unit cost")
    .action(async (opts) => {
      const db = await openDb();
      const result = await addProduct(db, {
        sku: opts.sku,
        name: opts.name,
        description: opts.description,
        price: parseFloatStrict(opts.price, "price"),
        cost: parseFloatStrict(opts.cost, "cost"),
      });
      print(result);
    });
  product.command("list").action(async () => {
    const db = await openDb();
    print(await listProducts(db));
  });
  product
    .command("update")
    .argument("<id>", "Product id")
    .option("--sku <sku>")
    .option("--name <name>")
    .option("--description <desc>")
    .option("--price <price>")
    .option("--cost <cost>")
    .action(async (idArg: string, opts) => {
      const db = await openDb();
      const patch: Record<string, string | number> = {};
      if (opts.sku) patch.sku = opts.sku;
      if (opts.name) patch.name = opts.name;
      if (opts.description) patch.description = opts.description;
      if (opts.price) patch.price = parseFloatStrict(opts.price, "price");
      if (opts.cost) patch.cost = parseFloatStrict(opts.cost, "cost");
      print(await updateProduct(db, parseInteger(idArg, "id"), patch));
    });
  product
    .command("delete")
    .argument("<id>")
    .action(async (idArg: string) => {
      const db = await openDb();
      await deleteProduct(db, parseInteger(idArg, "id"));
      print({ deleted: true });
    });

  const stock = program.command("stock").description("Manage stock");
  stock
    .command("warehouse-add")
    .requiredOption("--name <name>")
    .option("--location <location>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await createWarehouse(db, {
          name: opts.name,
          location: opts.location,
        }),
      );
    });
  stock.command("warehouse-list").action(async () => {
    const db = await openDb();
    print(await listWarehouses(db));
  });
  stock
    .command("in")
    .requiredOption("--product-id <id>")
    .requiredOption("--warehouse-id <id>")
    .requiredOption("--quantity <qty>")
    .option("--note <note>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await stockIn(db, {
          productId: parseInteger(opts.productId, "product-id"),
          warehouseId: parseInteger(opts.warehouseId, "warehouse-id"),
          quantity: parseInteger(opts.quantity, "quantity"),
          note: opts.note,
        }),
      );
    });
  stock
    .command("out")
    .requiredOption("--product-id <id>")
    .requiredOption("--warehouse-id <id>")
    .requiredOption("--quantity <qty>")
    .option("--note <note>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await stockOut(db, {
          productId: parseInteger(opts.productId, "product-id"),
          warehouseId: parseInteger(opts.warehouseId, "warehouse-id"),
          quantity: parseInteger(opts.quantity, "quantity"),
          note: opts.note,
        }),
      );
    });
  stock
    .command("status")
    .option("--product-id <id>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await getStockStatus(
          db,
          opts.productId ? parseInteger(opts.productId, "product-id") : undefined,
        ),
      );
    });

  const order = program.command("order").description("Manage orders");
  order
    .command("create")
    .requiredOption("--customer <name>")
    .requiredOption("--warehouse-id <id>")
    .requiredOption(
      "--items <items>",
      "Comma-separated productId:quantity pairs",
    )
    .option("--campaign-id <id>")
    .action(async (opts) => {
      const db = await openDb();
      const items = String(opts.items)
        .split(",")
        .map((pair) => {
          const [pid, qty] = pair.split(":");
          return {
            productId: parseInteger(pid ?? "", "items productId"),
            quantity: parseInteger(qty ?? "", "items quantity"),
          };
        });
      print(
        await createOrder(db, {
          customerName: opts.customer,
          warehouseId: parseInteger(opts.warehouseId, "warehouse-id"),
          items,
          campaignId: opts.campaignId
            ? parseInteger(opts.campaignId, "campaign-id")
            : undefined,
        }),
      );
    });
  order
    .command("list")
    .option("--status <status>")
    .option("--customer <name>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await listOrders(db, {
          status: opts.status,
          customerName: opts.customer,
        }),
      );
    });
  order
    .command("update-status")
    .argument("<id>")
    .argument("<status>")
    .action(async (idArg: string, status: string) => {
      const db = await openDb();
      print(
        await updateOrderStatus(
          db,
          parseInteger(idArg, "id"),
          status as Parameters<typeof updateOrderStatus>[2],
        ),
      );
    });

  const campaign = program.command("campaign").description("Manage campaigns");
  campaign
    .command("create")
    .requiredOption("--name <name>")
    .requiredOption("--type <type>", "PERCENT or FIXED")
    .requiredOption("--value <value>")
    .requiredOption("--start <date>", "YYYY-MM-DD")
    .requiredOption("--end <date>", "YYYY-MM-DD")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await createCampaign(db, {
          name: opts.name,
          discountType: opts.type,
          discountValue: parseFloatStrict(opts.value, "value"),
          startDate: opts.start,
          endDate: opts.end,
        }),
      );
    });
  campaign.command("list").action(async () => {
    const db = await openDb();
    print(await listCampaigns(db));
  });
  campaign
    .command("apply")
    .requiredOption("--campaign-id <id>")
    .requiredOption("--subtotal <amount>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await applyCampaign(
          db,
          parseInteger(opts.campaignId, "campaign-id"),
          parseFloatStrict(opts.subtotal, "subtotal"),
        ),
      );
    });

  const accounting = program
    .command("accounting")
    .description("Accounting & reports");
  accounting
    .command("record")
    .requiredOption("--type <type>")
    .requiredOption("--amount <amount>")
    .option("--reference-id <id>")
    .option("--reference-type <type>")
    .option("--note <note>")
    .action(async (opts) => {
      const db = await openDb();
      print(
        await recordTransaction(db, {
          type: opts.type,
          amount: parseFloatStrict(opts.amount, "amount"),
          referenceId: opts.referenceId
            ? parseInteger(opts.referenceId, "reference-id")
            : undefined,
          referenceType: opts.referenceType,
          note: opts.note,
        }),
      );
    });
  accounting.command("transactions").action(async () => {
    const db = await openDb();
    print(await listTransactions(db));
  });
  accounting
    .command("report")
    .requiredOption("--from <date>")
    .requiredOption("--to <date>")
    .action(async (opts) => {
      const db = await openDb();
      print(await generateSalesReport(db, { from: opts.from, to: opts.to }));
    });
  accounting.command("inventory-value").action(async () => {
    const db = await openDb();
    print(await calculateInventoryValue(db));
  });

  return program;
}

async function openDb() {
  const db = createDbClient(DB_URL);
  await initSchema(db);
  return db;
}

async function main() {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (
      err instanceof InsufficientStockError ||
      err instanceof NotFoundError ||
      err instanceof ValidationError
    ) {
      process.stderr.write(`${err.name}: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}

const isDirect = (() => {
  try {
    const argvHref = new URL(`file://${process.argv[1]}`).href;
    return import.meta.url === argvHref;
  } catch {
    return false;
  }
})();

if (isDirect) {
  void main();
}
