import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

async function runMigrations() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";
  console.log(`📦 Running migrations on: ${dbPath}`);

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  console.log("🔄 Applying migrations...");

  migrate(db, { migrationsFolder: "./drizzle/migrations" });

  console.log("✅ Migrations complete!");
  sqlite.close();
}

runMigrations().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
