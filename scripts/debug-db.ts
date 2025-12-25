#!/usr/bin/env tsx
/**
 * Debug script to test database connection and query the counters table
 * Run with: pnpm tsx scripts/debug-db.ts
 */

import * as fs from "node:fs";
import { counters } from "@/drizzle/schema";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";

interface TableInfo {
  name: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

function checkDatabaseFile(dbPath: string): boolean {
  console.info(`📁 Database path: ${dbPath}`);

  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.info(`✅ Database file exists (${stats.size} bytes)\n`);
      return true;
    }
    console.info("❌ Database file does not exist\n");
    return false;
  } catch (error) {
    console.info(`⚠️  Could not check file existence: ${error}\n`);
    return false;
  }
}

function listTables(sqlite: Database.Database): boolean {
  console.info("📋 Tables in database:");
  try {
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as TableInfo[];
    for (const table of tables) {
      console.info(`   - ${table.name}`);
    }
    console.info();
    return true;
  } catch (error) {
    console.info(`❌ Failed to list tables: ${error}\n`);
    return false;
  }
}

function showTableSchema(sqlite: Database.Database): boolean {
  console.info("📊 Counters table schema:");
  try {
    const schema = sqlite.prepare("PRAGMA table_info(counters)").all() as ColumnInfo[];
    for (const column of schema) {
      console.info(
        `   - ${column.name}: ${column.type} ${column.notnull ? "NOT NULL" : ""} ${column.pk ? "PRIMARY KEY" : ""}`
      );
    }
    console.info();
    return true;
  } catch (error) {
    console.info(`❌ Failed to get schema: ${error}\n`);
    return false;
  }
}

async function queryCountersWithDrizzle(sqlite: Database.Database): Promise<boolean> {
  console.info("🔍 Querying counters table with Drizzle...");
  try {
    const db = drizzle(sqlite);
    const result = await db.select().from(counters);
    console.info(`✅ Found ${result.length} counter(s):\n`);
    for (const counter of result) {
      console.info(`   ID: ${counter.id}`);
      console.info(`   Name: ${counter.name}`);
      console.info(`   Value: ${counter.value}`);
      console.info(`   Updated: ${new Date(counter.updatedAt).toISOString()}`);
      console.info();
    }
    return true;
  } catch (error) {
    console.info(`❌ Failed to query with Drizzle: ${error}\n`);
    return false;
  }
}

async function testInsertUpdateOperations(sqlite: Database.Database): Promise<boolean> {
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
    return true;
  } catch (error) {
    console.info(`❌ Failed to test operations: ${error}\n`);
    return false;
  }
}

async function debugDatabase() {
  console.info("🔍 Debugging database connection...\n");

  // Test 1: Check if database file exists
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";
  if (!checkDatabaseFile(dbPath)) {
    return;
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
  if (!listTables(sqlite)) {
    sqlite.close();
    return;
  }

  // Test 4: Check counters table schema
  if (!showTableSchema(sqlite)) {
    sqlite.close();
    return;
  }

  // Test 5: Query counters table using Drizzle
  if (!(await queryCountersWithDrizzle(sqlite))) {
    sqlite.close();
    return;
  }

  // Test 6: Test insert/update operations
  await testInsertUpdateOperations(sqlite);

  sqlite.close();
  console.info("✅ Database debug complete!");
}

debugDatabase().catch((error) => {
  console.error("❌ Debug script failed:", error);
  process.exit(1);
});
