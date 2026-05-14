import "server-only";
import { createClient, type Client } from "@libsql/client";
import { initSchema } from "./schema";

const DEFAULT_DB_URL = "file:../day2-inventory/inventory.db";

declare global {
  // eslint-disable-next-line no-var
  var __libsqlClient: Client | undefined;
  // eslint-disable-next-line no-var
  var __libsqlInitialized: boolean | undefined;
}

export async function getDb(): Promise<Client> {
  if (!globalThis.__libsqlClient) {
    const url = process.env.DB_URL ?? DEFAULT_DB_URL;
    globalThis.__libsqlClient = createClient({ url });
  }
  if (!globalThis.__libsqlInitialized) {
    await initSchema(globalThis.__libsqlClient);
    globalThis.__libsqlInitialized = true;
  }
  return globalThis.__libsqlClient;
}
