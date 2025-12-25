import { getEnv } from "@/lib/cloudflare";
import { createRequestLogger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

// Runtime will be adapted by OpenNext for Cloudflare Workers

const requestSchema = z.object({
  data: z.string(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const env = await getEnv();
    const pythonServiceUrl = env.PYTHON_SERVICE_URL || "http://localhost:8000";
    const pythonServiceSecret = env.PYTHON_SERVICE_SECRET;

    if (!pythonServiceSecret) {
      logger.warn("Python service secret not configured");
      return NextResponse.json({ error: "Python service not configured" }, { status: 503 });
    }

    logger.info("Calling Python service", { endpoint: "/process" });

    const response = await fetch(`${pythonServiceUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-secret": pythonServiceSecret,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Python service error", {
        status: response.status,
        error: errorText,
      });

      return NextResponse.json(
        { error: "Python service error", details: errorText },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();

    logger.info("Python service response received", {
      hasResult: !!(data as { result?: unknown }).result,
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to call Python service", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to call Python service",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);

  try {
    const env = await getEnv();
    const pythonServiceUrl = env.PYTHON_SERVICE_URL || "http://localhost:8000";

    const response = await fetch(`${pythonServiceUrl}/health`);
    const data: unknown = await response.json();

    return NextResponse.json({
      pythonService: data,
      nextjsRequestId: requestId,
    });
  } catch (error) {
    logger.error("Failed to check Python service health", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Python service unavailable",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
