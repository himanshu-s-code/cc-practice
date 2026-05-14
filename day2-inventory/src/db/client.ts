import { createClient, type Client } from "@libsql/client";

export function createDbClient(url: string): Client {
  return createClient({ url });
}

export type { Client };
