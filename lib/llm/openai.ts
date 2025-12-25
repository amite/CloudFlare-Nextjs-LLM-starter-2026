import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import type { LLMConfig, LLMMessage, LLMResponse, LLMUsage } from "./types";
import { calculateCost } from "./types";

export interface OpenAIConfig extends Omit<LLMConfig, "provider"> {
  model?: string;
}

/**
 * Create OpenAI client with custom API key.
 */
export function createOpenAIClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    compatibility: "strict",
  });
}

/**
 * Stream a chat completion from OpenAI.
 */
export async function streamOpenAIChat(
  messages: LLMMessage[],
  config: OpenAIConfig
): Promise<{
  stream: ReadableStream<Uint8Array>;
  usage: Promise<LLMUsage>;
  response: Promise<LLMResponse>;
}> {
  const openai = createOpenAIClient(config.apiKey);
  const model = config.model || "gpt-4o-mini";

  let finalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let fullContent = "";

  const result = streamText({
    model: openai(model),
    messages,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 2048,
    onFinish: async ({ text, usage }) => {
      fullContent = text;
      if (usage) {
        finalUsage = {
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        };
      }
    },
  });

  const stream = result.toDataStream();

  return {
    stream,
    usage: (async () => {
      await result;
      return finalUsage;
    })(),
    response: (async (): Promise<LLMResponse> => {
      await result;
      return {
        content: fullContent,
        usage: finalUsage,
        model,
        provider: "openai",
      };
    })(),
  };
}

/**
 * Generate a non-streaming chat completion from OpenAI.
 */
export async function generateOpenAIChat(
  messages: LLMMessage[],
  config: OpenAIConfig
): Promise<LLMResponse> {
  const openai = createOpenAIClient(config.apiKey);
  const model = config.model || "gpt-4o-mini";

  const result = await generateText({
    model: openai(model),
    messages,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 2048,
  });

  const usage: LLMUsage = {
    inputTokens: result.usage.promptTokens,
    outputTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
  };

  return {
    content: result.text,
    usage,
    model,
    provider: "openai",
    finishReason: result.finishReason,
  };
}

/**
 * Estimate token count for messages (rough approximation).
 * For accurate counts, use tiktoken library.
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost before making an API call.
 */
export function estimateCost(
  messages: LLMMessage[],
  model: string,
  maxOutputTokens = 2048
): number {
  const inputText = messages.map((m) => m.content).join(" ");
  const inputTokens = estimateTokenCount(inputText);

  return calculateCost(model, {
    inputTokens,
    outputTokens: maxOutputTokens,
    totalTokens: inputTokens + maxOutputTokens,
  });
}
