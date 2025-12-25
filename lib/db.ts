import * as schema from "@/drizzle/schema";
import Database from "better-sqlite3";
import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/d1";

import type { CloudflareEnv } from "./db-types";

// Re-export types from db-types to avoid importing better-sqlite3 in type-only contexts
export type { CloudflareEnv, DbInstance } from "./db-types";

// Re-export Database type for use in other modules
export type { default as Database } from "better-sqlite3";

// Get database instance from D1 binding (for production/Cloudflare)
export function getDb(env: CloudflareEnv) {
  return drizzle(env.DB, { schema });
}

// Get database instance from local SQLite (for development)
export function getLocalDb() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";
  const sqlite = new Database(dbPath);
  return drizzleBetterSqlite(sqlite, { schema });
}

// Helper to get the Cloudflare env from various contexts
export function getCloudflareEnv(): CloudflareEnv | null {
  // In Cloudflare Workers, the env is typically passed through the request context
  // This function is a placeholder for getting the env from the current context
  // The actual implementation depends on how you access the env in your routes

  // For Next.js App Router with OpenNext, you can access it via:
  // - Server Components: through the getCloudflareContext() helper
  // - Route Handlers: through the request context

  return null;
}
