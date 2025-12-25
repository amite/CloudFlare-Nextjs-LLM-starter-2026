import { getDatabase } from "@/lib/cloudflare";
import { costTracker } from "@/lib/cost-tracker";
import { createRequestLogger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

// Runtime will be adapted by OpenNext for Cloudflare Workers

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
});

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);

  try {
    const url = new URL(request.url);
    const params = {
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      userId: url.searchParams.get("userId") || undefined,
    };

    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Initialize cost tracker with database
    try {
      const db = await getDatabase();
      costTracker.setDatabase(db);
    } catch {
      logger.warn("Database not available for usage summary");
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const options = {
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      userId: parsed.data.userId,
    };

    const summary = await costTracker.getSummary(options);

    if (!summary) {
      return NextResponse.json({ error: "Failed to get usage summary" }, { status: 500 });
    }

    logger.info("Usage summary retrieved", {
      totalRequests: summary.totalRequests,
      totalCost: summary.totalCost,
    });

    return NextResponse.json({
      ...summary,
      requestId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get usage summary", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to get usage summary",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500 }
    );
  }
}
