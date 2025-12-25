import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv, DbInstance } from "./db";

// Re-export CloudflareEnv for convenience
export type { CloudflareEnv, DbInstance };

// Extended env with secrets
export interface CloudflareEnvWithSecrets extends CloudflareEnv {
  // LLM API Keys
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEFAULT_LLM_PROVIDER?: string;

  // Auth
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // Python Service
  PYTHON_SERVICE_URL?: string;
  PYTHON_SERVICE_SECRET?: string;

  // Logging
  LOG_LEVEL?: string;
  ENABLE_COST_TRACKING?: string;
  COST_ALERT_THRESHOLD?: string;

  // App
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}

/**
 * Get Cloudflare context for server components and route handlers.
 * This provides access to D1, R2, and other Cloudflare bindings.
 *
 * @example
 * ```ts
 * import { getEnv, getDatabase } from "@/lib/cloudflare";
 *
 * // In a Server Component or Route Handler
 * const env = await getEnv();
 * const db = getDatabase(env);
 * ```
 */
export async function getEnv(): Promise<CloudflareEnvWithSecrets> {
  // In development, fall back to process.env for environment variables
  if (process.env.NODE_ENV === "development") {
    return {
      // Cloudflare bindings (not available in development)
      // Auth will use Drizzle adapter with local SQLite instead
      DB: undefined as unknown as D1Database,
      ASSETS: undefined as unknown as Fetcher,
      // Environment variables from .env
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER,
      AUTH_SECRET: process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL,
      PYTHON_SERVICE_SECRET: process.env.PYTHON_SERVICE_SECRET,
      LOG_LEVEL: process.env.LOG_LEVEL,
      ENABLE_COST_TRACKING: process.env.ENABLE_COST_TRACKING,
      COST_ALERT_THRESHOLD: process.env.COST_ALERT_THRESHOLD,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    };
  }

  const { env } = await getCloudflareContext();
  return env as CloudflareEnvWithSecrets;
}

/**
 * Get database from Cloudflare context or local SQLite for development.
 * Convenience wrapper that combines getEnv and getDb.
 *
 * In development mode (NODE_ENV=development), uses local SQLite database.
 * In production, uses Cloudflare D1 database.
 */
export async function getDatabase() {
  const { getDb, getLocalDb } = await import("./db");

  // Use local SQLite in development, D1 in production
  if (process.env.NODE_ENV === "development") {
    return getLocalDb();
  }

  const env = await getEnv();
  return getDb(env);
}
