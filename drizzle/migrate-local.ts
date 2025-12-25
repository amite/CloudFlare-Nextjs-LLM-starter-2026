import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

async function runMigrations() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  sqlite.close();
}

runMigrations().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
