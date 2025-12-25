import NextAuth from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import { authConfig } from "./config";
import type { CloudflareEnvWithSecrets } from "@/lib/cloudflare";

/**
 * Create Auth.js instance with D1 adapter.
 * This must be called with the Cloudflare env to get the D1 database binding.
 */
export function createAuth(env: CloudflareEnvWithSecrets) {
  return NextAuth({
    ...authConfig,
    adapter: D1Adapter(env.DB),
    secret: env.AUTH_SECRET,
  });
}

// Re-export types
export type { Session, User } from "next-auth";

// Re-export config for middleware use
export { authConfig } from "./config";
