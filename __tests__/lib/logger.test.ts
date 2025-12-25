import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger, createRequestLogger } from "@/lib/logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Logger class", () => {
    it("should create logger with default options", () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should create logger with custom level", () => {
      const logger = new Logger({ level: "error" });
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should create logger with custom context", () => {
      const logger = new Logger({ context: { service: "test" } });
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should log info messages", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger({ level: "info" });

      logger.info("Test message", { key: "value" });

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("info");
      expect(logOutput.message).toBe("Test message");
      expect(logOutput.context.key).toBe("value");
    });

    it("should not log debug when level is info", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger({ level: "info" });

      logger.debug("Debug message");

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("should log warn messages", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger({ level: "warn" });

      logger.warn("Warning message");

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("warn");
    });

    it("should log error messages", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger({ level: "error" });

      logger.error("Error message");

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("error");
    });

    it("should create child logger with merged context", () => {
      const parent = new Logger({ context: { parent: true } });
      const child = parent.child({ child: true });

      expect(child).toBeInstanceOf(Logger);
    });

    it("should log LLM calls with context", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger({ level: "info" });

      logger.llm("LLM call", {
        provider: "openai",
        model: "gpt-4o-mini",
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.0001,
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.context.type).toBe("llm_call");
      expect(logOutput.context.provider).toBe("openai");
    });
  });

  describe("createRequestLogger", () => {
    it("should create logger with request ID", () => {
      const logger = createRequestLogger("test-request-id");
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should create logger with generated ID when not provided", () => {
      const logger = createRequestLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should include user ID in context when provided", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = createRequestLogger("req-123", "user-456");

      logger.info("Test");

      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.context.requestId).toBe("req-123");
      expect(logOutput.context.userId).toBe("user-456");
    });
  });
});
