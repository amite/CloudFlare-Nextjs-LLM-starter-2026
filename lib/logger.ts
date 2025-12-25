export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

export interface LLMLogContext extends LogContext {
  provider: "openai" | "gemini";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  status?: "success" | "error";
  errorMessage?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext | LLMLogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured logger for Cloudflare Workers.
 * Outputs JSON logs that can be collected via Cloudflare Logpush.
 */
export class Logger {
  private minLevel: LogLevel;
  private defaultContext: LogContext;

  constructor(options: { level?: LogLevel; context?: LogContext } = {}) {
    this.minLevel = options.level || (process.env.LOG_LEVEL as LogLevel) || "info";
    this.defaultContext = options.context || {};
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
    };
  }

  private output(entry: LogEntry): void {
    // In Cloudflare Workers, console.log outputs to Logpush
    // biome-ignore lint/suspicious/noConsoleLog: Logger output is intentional
    console.log(JSON.stringify(entry));
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      this.output(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      this.output(this.formatLog("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      this.output(this.formatLog("warn", message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog("error")) {
      this.output(this.formatLog("error", message, context));
    }
  }

  /**
   * Log LLM API call with cost tracking context.
   */
  llm(message: string, context: LLMLogContext): void {
    this.info(message, {
      ...context,
      type: "llm_call",
    });
  }

  /**
   * Create a child logger with additional context.
   */
  child(context: LogContext): Logger {
    return new Logger({
      level: this.minLevel,
      context: { ...this.defaultContext, ...context },
    });
  }
}

// Default logger instance
export const logger = new Logger();

/**
 * Create a request-scoped logger with request ID.
 */
export function createRequestLogger(requestId?: string, userId?: string): Logger {
  return new Logger({
    context: {
      requestId: requestId || crypto.randomUUID(),
      userId,
    },
  });
}

export default logger;
