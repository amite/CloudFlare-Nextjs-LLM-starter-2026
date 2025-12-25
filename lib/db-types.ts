// Type-only exports for database - no runtime dependencies
// This file can be safely imported in edge runtime contexts

// Type for Cloudflare environment bindings
export interface CloudflareEnv {
  DB: D1Database;
  LOGS_BUCKET?: R2Bucket;
  ASSETS: Fetcher;
}

// Database instance types (using conditional type to avoid importing better-sqlite3)
// biome-ignore lint/suspicious/noExplicitAny: Type will be properly inferred at usage site to avoid importing better-sqlite3
export type DbInstance = any;
