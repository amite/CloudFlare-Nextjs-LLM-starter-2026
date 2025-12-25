import { generateGeminiChat, streamGeminiChat } from "./gemini";
import { generateOpenAIChat, streamOpenAIChat } from "./openai";
import type { LLMConfig, LLMMessage, LLMProvider, LLMResponse, LLMUsage } from "./types";
import { DEFAULT_MODELS } from "./types";

export * from "./types";
export * from "./openai";
export * from "./gemini";

export interface StreamChatOptions {
  messages: LLMMessage[];
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  // Environment for getting API keys
  env?: {
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    DEFAULT_LLM_PROVIDER?: string;
  };
}

export interface StreamChatResult {
  stream: ReadableStream<Uint8Array>;
  usage: Promise<LLMUsage>;
  response: Promise<LLMResponse>;
  provider: LLMProvider;
  model: string;
}

/**
 * Stream a chat completion from the configured LLM provider.
 * Automatically selects the provider based on configuration.
 */
export async function streamChat(options: StreamChatOptions): Promise<StreamChatResult> {
  const provider =
    options.provider || (options.env?.DEFAULT_LLM_PROVIDER as LLMProvider) || "openai";
  const model = options.model || DEFAULT_MODELS[provider];

  const apiKey =
    options.apiKey ||
    (provider === "openai" ? options.env?.OPENAI_API_KEY : options.env?.GEMINI_API_KEY);

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  const config: LLMConfig = {
    provider,
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    apiKey,
  };

  const result =
    provider === "openai"
      ? await streamOpenAIChat(options.messages, config)
      : await streamGeminiChat(options.messages, config);

  return {
    ...result,
    provider,
    model,
  };
}

/**
 * Generate a non-streaming chat completion.
 */
export async function generateChat(options: StreamChatOptions): Promise<LLMResponse> {
  const provider =
    options.provider || (options.env?.DEFAULT_LLM_PROVIDER as LLMProvider) || "openai";
  const model = options.model || DEFAULT_MODELS[provider];

  const apiKey =
    options.apiKey ||
    (provider === "openai" ? options.env?.OPENAI_API_KEY : options.env?.GEMINI_API_KEY);

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  const config: LLMConfig = {
    provider,
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    apiKey,
  };

  return provider === "openai"
    ? generateOpenAIChat(options.messages, config)
    : generateGeminiChat(options.messages, config);
}

/**
 * Helper to create a system message.
 */
export function systemMessage(content: string): LLMMessage {
  return { role: "system", content };
}

/**
 * Helper to create a user message.
 */
export function userMessage(content: string): LLMMessage {
  return { role: "user", content };
}

/**
 * Helper to create an assistant message.
 */
export function assistantMessage(content: string): LLMMessage {
  return { role: "assistant", content };
}
