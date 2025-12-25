import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/cloudflare";
import { counters } from "@/drizzle/schema";
import { createRequestLogger } from "@/lib/logger";

export const runtime = "edge";

// GET - Fetch counter value
export async function GET() {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);

  try {
    const db = await getDatabase();
    const result = await db.select().from(counters).where(eq(counters.name, "default")).limit(1);

    if (result.length === 0) {
      // Create default counter if it doesn't exist
      const newCounter = await db
        .insert(counters)
        .values({ name: "default", value: 0 })
        .returning();

      logger.info("Created default counter", { counterId: newCounter[0].id });
      return NextResponse.json(newCounter[0]);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    logger.error("Failed to fetch counter", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: "Failed to fetch counter" }, { status: 500 });
  }
}

// POST - Increment or decrement counter
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);

  try {
    const body = await request.json();
    const action = body.action as "increment" | "decrement";

    if (!action || !["increment", "decrement"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use 'increment' or 'decrement'" }, { status: 400 });
    }

    const db = await getDatabase();

    // Get current counter
    const current = await db.select().from(counters).where(eq(counters.name, "default")).limit(1);

    if (current.length === 0) {
      return NextResponse.json({ error: "Counter not found" }, { status: 404 });
    }

    const newValue = action === "increment" ? current[0].value + 1 : current[0].value - 1;

    // Update counter
    const updated = await db
      .update(counters)
      .set({
        value: newValue,
        updatedAt: new Date(),
      })
      .where(eq(counters.name, "default"))
      .returning();

    logger.info("Counter updated", {
      action,
      previousValue: current[0].value,
      newValue: updated[0].value,
    });

    return NextResponse.json(updated[0]);
  } catch (error) {
    logger.error("Failed to update counter", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: "Failed to update counter" }, { status: 500 });
  }
}
