import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// LLM Usage logs for cost tracking
export const usageLogs = sqliteTable("usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull(),
  userId: text("user_id"),
  provider: text("provider").notNull(), // 'openai' | 'gemini'
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull().default("success"), // 'success' | 'error'
  errorMessage: text("error_message"),
  endpoint: text("endpoint"),
  metadata: text("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Type exports
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
