export type LLMProvider = "openai" | "gemini";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  model: string;
  provider: LLMProvider;
  finishReason?: string;
}

export interface LLMStreamCallbacks {
  onToken?: (token: string) => void;
  onUsage?: (usage: LLMUsage) => void;
  onFinish?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

// Model pricing in USD per 1K tokens (as of Dec 2024)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI models
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },

  // Gemini models
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  "gemini-1.0-pro": { input: 0.0005, output: 0.0015 },
};

/**
 * Calculate cost in USD for token usage.
 */
export function calculateCost(model: string, usage: LLMUsage): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Default to gpt-4o-mini pricing if model not found
    return (usage.inputTokens * 0.00015 + usage.outputTokens * 0.0006) / 1000;
  }
  return (usage.inputTokens * pricing.input + usage.outputTokens * pricing.output) / 1000;
}

// Default models for each provider
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
};
