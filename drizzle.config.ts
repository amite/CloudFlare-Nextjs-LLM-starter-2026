import { defineConfig } from "drizzle-kit";

// For local development, use SQLite
// For production D1 migrations, set CLOUDFLARE_* env vars and use d1-http driver
const isD1 =
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_DATABASE_ID &&
  process.env.CLOUDFLARE_D1_TOKEN;

export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  ...(isD1
    ? {
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID as string,
          token: process.env.CLOUDFLARE_D1_TOKEN as string,
        },
      }
    : {
        dbCredentials: {
          url: process.env.DATABASE_URL || "file:./local.db",
        },
      }),
});
