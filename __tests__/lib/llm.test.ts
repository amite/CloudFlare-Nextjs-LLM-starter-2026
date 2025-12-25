import { describe, it, expect } from "vitest";
import {
  calculateCost,
  MODEL_PRICING,
  DEFAULT_MODELS,
  systemMessage,
  userMessage,
  assistantMessage,
} from "@/lib/llm";

describe("LLM utilities", () => {
  describe("calculateCost", () => {
    it("should calculate cost for gpt-4o-mini correctly", () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };
      const cost = calculateCost("gpt-4o-mini", usage);
      // Input: 1000 * 0.00015 / 1000 = 0.00015
      // Output: 500 * 0.0006 / 1000 = 0.0003
      // Total: 0.00045
      expect(cost).toBeCloseTo(0.00045, 5);
    });

    it("should calculate cost for gpt-4o correctly", () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };
      const cost = calculateCost("gpt-4o", usage);
      // Input: 1000 * 0.0025 / 1000 = 0.0025
      // Output: 500 * 0.01 / 1000 = 0.005
      // Total: 0.0075
      expect(cost).toBeCloseTo(0.0075, 5);
    });

    it("should use default pricing for unknown models", () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };
      const cost = calculateCost("unknown-model", usage);
      // Falls back to gpt-4o-mini pricing
      expect(cost).toBeCloseTo(0.00045, 5);
    });
  });

  describe("MODEL_PRICING", () => {
    it("should have pricing for all expected models", () => {
      expect(MODEL_PRICING["gpt-4o"]).toBeDefined();
      expect(MODEL_PRICING["gpt-4o-mini"]).toBeDefined();
      expect(MODEL_PRICING["gpt-4-turbo"]).toBeDefined();
      expect(MODEL_PRICING["gemini-1.5-pro"]).toBeDefined();
      expect(MODEL_PRICING["gemini-1.5-flash"]).toBeDefined();
    });

    it("should have input and output pricing for each model", () => {
      for (const [model, pricing] of Object.entries(MODEL_PRICING)) {
        expect(pricing.input).toBeTypeOf("number");
        expect(pricing.output).toBeTypeOf("number");
        expect(pricing.input).toBeGreaterThan(0);
        expect(pricing.output).toBeGreaterThan(0);
      }
    });
  });

  describe("DEFAULT_MODELS", () => {
    it("should have default models for each provider", () => {
      expect(DEFAULT_MODELS.openai).toBe("gpt-4o-mini");
      expect(DEFAULT_MODELS.gemini).toBe("gemini-1.5-flash");
    });
  });

  describe("message helpers", () => {
    it("should create system message correctly", () => {
      const msg = systemMessage("You are a helpful assistant");
      expect(msg).toEqual({
        role: "system",
        content: "You are a helpful assistant",
      });
    });

    it("should create user message correctly", () => {
      const msg = userMessage("Hello!");
      expect(msg).toEqual({
        role: "user",
        content: "Hello!",
      });
    });

    it("should create assistant message correctly", () => {
      const msg = assistantMessage("Hi there!");
      expect(msg).toEqual({
        role: "assistant",
        content: "Hi there!",
      });
    });
  });
});
