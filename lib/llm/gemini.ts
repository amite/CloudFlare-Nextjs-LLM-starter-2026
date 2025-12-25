import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import type { LLMConfig, LLMMessage, LLMResponse, LLMUsage } from "./types";

export interface GeminiConfig extends Omit<LLMConfig, "provider"> {
  model?: string;
}

/**
 * Create Google Gemini client with custom API key.
 */
export function createGeminiClient(apiKey: string) {
  return createGoogleGenerativeAI({
    apiKey,
  });
}

/**
 * Stream a chat completion from Gemini.
 */
export async function streamGeminiChat(
  messages: LLMMessage[],
  config: GeminiConfig
): Promise<{
  stream: ReadableStream<Uint8Array>;
  usage: Promise<LLMUsage>;
  response: Promise<LLMResponse>;
}> {
  const google = createGeminiClient(config.apiKey);
  const model = config.model || "gemini-1.5-flash";

  let finalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let fullContent = "";

  const result = streamText({
    model: google(model),
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
        provider: "gemini",
      };
    })(),
  };
}

/**
 * Generate a non-streaming chat completion from Gemini.
 */
export async function generateGeminiChat(
  messages: LLMMessage[],
  config: GeminiConfig
): Promise<LLMResponse> {
  const google = createGeminiClient(config.apiKey);
  const model = config.model || "gemini-1.5-flash";

  const result = await generateText({
    model: google(model),
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
    provider: "gemini",
    finishReason: result.finishReason,
  };
}
