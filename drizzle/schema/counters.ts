import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Counter example table for CRUD demonstration
export const counters = sqliteTable("counters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("default"),
  value: integer("value").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Type exports
export type Counter = typeof counters.$inferSelect;
export type NewCounter = typeof counters.$inferInsert;
