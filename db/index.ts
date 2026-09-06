import { env } from "cloudflare:workers";

export function getD1(): D1Database {
  const database = (env as typeof env & { DB?: D1Database }).DB;
  if (!database) {
    throw new Error("Cloudflare D1 binding DB is unavailable");
  }
  return database;
}
