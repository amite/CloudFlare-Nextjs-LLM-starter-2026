#!/usr/bin/env tsx
/**
 * Debug script to test database connection and query the counters table
 * Run with: pnpm tsx scripts/debug-db.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { counters } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import * as fs from "node:fs";

async function debugDatabase() {
  console.info("🔍 Debugging database connection...\n");

  // Test 1: Check if database file exists
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";
  console.info(`📁 Database path: ${dbPath}`);

  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.info(`✅ Database file exists (${stats.size} bytes)\n`);
    } else {
      console.info(`❌ Database file does not exist\n`);
      return;
    }
  } catch (error) {
    console.info(`⚠️  Could not check file existence: ${error}\n`);
  }

  // Test 2: Connect to database
  console.info("🔌 Connecting to database...");
  let sqlite: Database.Database;
  try {
    sqlite = new Database(dbPath);
    console.info("✅ Connected to database\n");
  } catch (error) {
    console.info(`❌ Failed to connect: ${error}\n`);
    return;
  }

  // Test 3: List all tables
  console.info("📋 Tables in database:");
  try {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    tables.forEach((table: any) => console.info(`   - ${table.name}`));
    console.info();
  } catch (error) {
    console.info(`❌ Failed to list tables: ${error}\n`);
    sqlite.close();
    return;
  }

  // Test 4: Check counters table schema
  console.info("📊 Counters table schema:");
  try {
    const schema = sqlite.prepare("PRAGMA table_info(counters)").all();
    schema.forEach((column: any) => {
      console.info(
        `   - ${column.name}: ${column.type} ${column.notnull ? "NOT NULL" : ""} ${column.pk ? "PRIMARY KEY" : ""}`
      );
    });
    console.info();
  } catch (error) {
    console.info(`❌ Failed to get schema: ${error}\n`);
    sqlite.close();
    return;
  }

  // Test 5: Query counters table using Drizzle
  console.info("🔍 Querying counters table with Drizzle...");
  try {
    const db = drizzle(sqlite);
    const result = await db.select().from(counters);
    console.info(`✅ Found ${result.length} counter(s):\n`);
    result.forEach((counter) => {
      console.info(`   ID: ${counter.id}`);
      console.info(`   Name: ${counter.name}`);
      console.info(`   Value: ${counter.value}`);
      console.info(`   Updated: ${new Date(counter.updatedAt).toISOString()}`);
      console.info();
    });
  } catch (error) {
    console.info(`❌ Failed to query with Drizzle: ${error}\n`);
    sqlite.close();
    return;
  }

  // Test 6: Test insert/update operations
  console.info("🧪 Testing insert/update operations...");
  try {
    const db = drizzle(sqlite);

    // Test update
    const updated = await db
      .update(counters)
      .set({ value: 42, updatedAt: new Date() })
      .where(eq(counters.name, "default"))
      .returning();

    console.info(`✅ Updated counter to value: ${updated[0].value}`);

    // Test select
    const selected = await db.select().from(counters).where(eq(counters.name, "default"));
    console.info(`✅ Selected counter with value: ${selected[0].value}\n`);

    // Reset to 0
    await db
      .update(counters)
      .set({ value: 0, updatedAt: new Date() })
      .where(eq(counters.name, "default"));
    console.info("✅ Reset counter to 0\n");
  } catch (error) {
    console.info(`❌ Failed to test operations: ${error}\n`);
  }

  sqlite.close();
  console.info("✅ Database debug complete!");
}

debugDatabase().catch((error) => {
  console.error("❌ Debug script failed:", error);
  process.exit(1);
});
