import * as schema from "@/drizzle/schema";
import { drizzle } from "drizzle-orm/d1";

// Type for Cloudflare environment bindings
export interface CloudflareEnv {
  DB: D1Database;
  LOGS_BUCKET?: R2Bucket;
  ASSETS: Fetcher;
}

// Get database instance from D1 binding
export function getDb(env: CloudflareEnv) {
  return drizzle(env.DB, { schema });
}

// Type export for the database instance
export type Database = ReturnType<typeof getDb>;

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
