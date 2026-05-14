import { createClient, type Client } from "@libsql/client";
import { initSchema } from "../../src/db/schema.js";

export async function createTestDb(): Promise<Client> {
  const db = createClient({ url: ":memory:" });
  await initSchema(db);
  return db;
}

export async function seedWarehouse(
  db: Client,
  name = "Main",
  location = "HQ",
): Promise<number> {
  const res = await db.execute({
    sql: `INSERT INTO warehouses (name, location) VALUES (?, ?) RETURNING id`,
    args: [name, location],
  });
  return Number(res.rows[0].id);
}
