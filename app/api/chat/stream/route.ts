import { getDatabase, getEnv } from "@/lib/cloudflare";
import { costTracker } from "@/lib/cost-tracker";
import { type LLMProvider, streamChat } from "@/lib/llm";
import { createRequestLogger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  provider: z.enum(["openai", "gemini"]).optional(),
  model: z.string().optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, provider, model } = parsed.data;
    const env = await getEnv();

    // Initialize cost tracker with database
    try {
      const db = await getDatabase();
      costTracker.setDatabase(db);
    } catch {
      logger.warn("Database not available for cost tracking");
    }

    logger.info("Starting LLM stream", {
      provider: provider || env.DEFAULT_LLM_PROVIDER || "openai",
      model,
      messageCount: messages.length,
    });

    const result = await streamChat({
      messages,
      provider: provider as LLMProvider | undefined,
      model,
      env: {
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        GEMINI_API_KEY: env.GEMINI_API_KEY,
        DEFAULT_LLM_PROVIDER: env.DEFAULT_LLM_PROVIDER,
      },
    });

    // Track usage after stream completes (non-blocking)
    result.response
      .then(async (response) => {
        const latencyMs = Date.now() - startTime;

        await costTracker.track({
          requestId,
          provider: response.provider,
          model: response.model,
          usage: response.usage,
          latencyMs,
          status: "success",
          endpoint: "/api/chat/stream",
        });

        logger.info("LLM stream completed", {
          provider: response.provider,
          model: response.model,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          latencyMs,
        });
      })
      .catch((error) => {
        logger.error("Failed to track usage", {
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return new Response(result.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    logger.error("LLM stream failed", {
      error: error instanceof Error ? error.message : String(error),
      latencyMs,
    });

    return NextResponse.json(
      {
        error: "Failed to generate response",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500 }
    );
  }
}
