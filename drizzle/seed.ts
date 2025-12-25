import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { counters } from "./schema";

async function seed() {
  const sqlite = new Database(process.env.DATABASE_URL?.replace("file:", "") || "./local.db");
  const db = drizzle(sqlite);

  // Create default counter
  const existingCounter = await db.select().from(counters).limit(1);

  if (existingCounter.length === 0) {
    await db.insert(counters).values({
      name: "default",
      value: 0,
    });
  } else {
  }
  sqlite.close();
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
