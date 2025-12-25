import { accounts, authenticators, sessions, users, verificationTokens } from "@/drizzle/schema";
import type { CloudflareEnvWithSecrets } from "@/lib/cloudflare";
import { getDb, getLocalDb } from "@/lib/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import { authConfig } from "./config";

/**
 * Create Auth.js instance with Drizzle adapter.
 * Uses local SQLite in development and D1 in production.
 */
export function createAuth(env: CloudflareEnvWithSecrets) {
  let database;

  // Use appropriate database based on environment
  if (process.env.NODE_ENV === "development") {
    database = getLocalDb();
  } else {
    database = getDb(env);
  }

  // Create schema object in the format expected by DrizzleAdapter
  const adapterSchema = {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  };

  return NextAuth({
    ...authConfig,
    adapter: DrizzleAdapter(database, adapterSchema),
    secret: env.AUTH_SECRET,
  });
}

// Re-export types
export type { Session, User } from "next-auth";

// Re-export config for middleware use
export { authConfig } from "./config";
