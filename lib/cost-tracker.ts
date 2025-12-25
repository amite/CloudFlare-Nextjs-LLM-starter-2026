import { type NewUsageLog, usageLogs } from "@/drizzle/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import type { DbInstance } from "./db";
import { type LLMProvider, type LLMUsage, calculateCost } from "./llm/types";
import { type LLMLogContext, logger } from "./logger";

export interface CostTrackerConfig {
  enabled?: boolean;
  alertThreshold?: number; // USD per day
}

export interface UsageSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  byProvider: Record<string, { cost: number; tokens: number; requests: number }>;
  byModel: Record<string, { cost: number; tokens: number; requests: number }>;
}

/**
 * Cost tracker for LLM API calls.
 * Logs usage to the database and provides analytics.
 */
export class CostTracker {
  private db: DbInstance | null = null;
  private config: CostTrackerConfig;

  constructor(config: CostTrackerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      alertThreshold: config.alertThreshold ?? 10.0, // $10/day default
    };
  }

  /**
   * Set the database instance for logging.
   */
  setDatabase(db: DbInstance): void {
    this.db = db;
  }

  /**
   * Track an LLM API call.
   */
  async track(params: {
    requestId: string;
    userId?: string;
    provider: LLMProvider;
    model: string;
    usage: LLMUsage;
    latencyMs?: number;
    status?: "success" | "error";
    errorMessage?: string;
    endpoint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.config.enabled) return;

    const cost = calculateCost(params.model, params.usage);

    // Log to structured logger
    const logContext: LLMLogContext = {
      requestId: params.requestId,
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      inputTokens: params.usage.inputTokens,
      outputTokens: params.usage.outputTokens,
      totalTokens: params.usage.totalTokens,
      costUsd: cost,
      latencyMs: params.latencyMs,
      status: params.status || "success",
      errorMessage: params.errorMessage,
      endpoint: params.endpoint,
    };

    logger.llm("LLM API call completed", logContext);

    // Log to database if available
    if (this.db) {
      const logEntry: NewUsageLog = {
        requestId: params.requestId,
        userId: params.userId,
        provider: params.provider,
        model: params.model,
        inputTokens: params.usage.inputTokens,
        outputTokens: params.usage.outputTokens,
        totalTokens: params.usage.totalTokens,
        costUsd: cost,
        latencyMs: params.latencyMs,
        status: params.status || "success",
        errorMessage: params.errorMessage,
        endpoint: params.endpoint,
        metadata: params.metadata,
      };

      try {
        await this.db.insert(usageLogs).values(logEntry);
      } catch (error) {
        logger.error("Failed to log usage to database", {
          error: error instanceof Error ? error.message : String(error),
          requestId: params.requestId,
        });
      }

      // Check daily cost threshold
      await this.checkDailyThreshold(params.userId);
    }
  }

  /**
   * Check if daily cost exceeds threshold.
   */
  private async checkDailyThreshold(userId?: string): Promise<void> {
    if (!this.db || !this.config.alertThreshold) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      type AggregateResult = {
        totalCost: number | null;
      };

      const result = (await this.db
        .select()
        .from(usageLogs)
        .where(gte(usageLogs.createdAt, today))) as unknown as AggregateResult[];

      const dailyCost = result.reduce((sum, log) => sum + (log as any).costUsd, 0);

      if (dailyCost > this.config.alertThreshold) {
        logger.warn("Daily cost threshold exceeded", {
          dailyCost,
          threshold: this.config.alertThreshold,
          userId,
        });
      }
    } catch (error) {
      logger.error("Failed to check daily threshold", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get usage summary for a time period.
   */
  async getSummary(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    } = {}
  ): Promise<UsageSummary | null> {
    if (!this.db) return null;

    const conditions: Array<ReturnType<typeof gte | typeof lte | typeof eq>> = [];

    if (options.startDate) {
      conditions.push(gte(usageLogs.createdAt, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(usageLogs.createdAt, options.endDate));
    }
    if (options.userId) {
      conditions.push(eq(usageLogs.userId, options.userId));
    }

    try {
      const logs = await this.db
        .select()
        .from(usageLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const summary: UsageSummary = {
        totalCost: 0,
        totalTokens: 0,
        totalRequests: logs.length,
        byProvider: {},
        byModel: {},
      };

      for (const log of logs) {
        summary.totalCost += log.costUsd;
        summary.totalTokens += log.totalTokens;

        // Aggregate by provider
        if (!summary.byProvider[log.provider]) {
          summary.byProvider[log.provider] = { cost: 0, tokens: 0, requests: 0 };
        }
        summary.byProvider[log.provider].cost += log.costUsd;
        summary.byProvider[log.provider].tokens += log.totalTokens;
        summary.byProvider[log.provider].requests += 1;

        // Aggregate by model
        if (!summary.byModel[log.model]) {
          summary.byModel[log.model] = { cost: 0, tokens: 0, requests: 0 };
        }
        summary.byModel[log.model].cost += log.costUsd;
        summary.byModel[log.model].tokens += log.totalTokens;
        summary.byModel[log.model].requests += 1;
      }

      return summary;
    } catch (error) {
      logger.error("Failed to get usage summary", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// Default cost tracker instance
export const costTracker = new CostTracker();

export default costTracker;
