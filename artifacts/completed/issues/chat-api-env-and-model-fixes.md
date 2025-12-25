# Issue: Chat API Environment Variables and Model Configuration

## Description
The chat functionality at `/examples/chat` was experiencing two separate issues:
1. **OpenAI:** API key not found error when using OpenAI provider
2. **Gemini:** Stream returning "An error occurred" with 0 tokens

## Context
- **Component:** Chat example page and API route
- **Error Location:** `app/api/chat/stream/route.ts`
- **Environment:** Local development with `pnpm dev`
- **Runtime:** Edge runtime

## Issue 1: OpenAI API Key Not Found

### Error Message
```json
{
  "timestamp": "2025-12-25T08:02:03.582Z",
  "level": "error",
  "message": "LLM stream failed",
  "context": {
    "requestId": "eb108534-f4ef-49a9-847b-c61f116bb056",
    "error": "API key not found for provider: openai",
    "latencyMs": 0
  }
}
```

### Root Cause
The [`getEnv()`](lib/cloudflare.ts:48) function was using Cloudflare bindings to access environment variables via `getCloudflareContext()`. However, in development mode with edge runtime, the `.env` variables were not available through the Cloudflare context. The function was returning an empty environment object, causing the API key lookup to fail.

The issue arose from a mismatch between:
1. **Runtime configuration:** Edge runtime (designed for Cloudflare Workers)
2. **Environment access:** Cloudflare bindings (not available in local development)
3. **Development environment:** Local development using `next dev` with `.env` file

### Resolution
Modified [`getEnv()`](lib/cloudflare.ts:48) in `lib/cloudflare.ts` to fall back to `process.env` when in development mode:

```typescript
export async function getEnv(): Promise<CloudflareEnvWithSecrets> {
  // In development, fall back to process.env for environment variables
  if (process.env.NODE_ENV === "development") {
    return {
      // Cloudflare bindings (not available in development)
      DB: undefined as any,
      ASSETS: undefined as any,
      // Environment variables from .env
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER,
      AUTH_SECRET: process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL,
      PYTHON_SERVICE_SECRET: process.env.PYTHON_SERVICE_SECRET,
      LOG_LEVEL: process.env.LOG_LEVEL,
      ENABLE_COST_TRACKING: process.env.ENABLE_COST_TRACKING,
      COST_ALERT_THRESHOLD: process.env.COST_ALERT_THRESHOLD,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    };
  }

  const { env } = await getCloudflareContext();
  return env as CloudflareEnvWithSecrets;
}
```

## Issue 2: Gemini Stream Error

### Error Message
The stream was returning `"An error occurred."` with logs showing:
```json
{
  "timestamp": "2025-12-25T08:06:10.995Z",
  "level": "info",
  "message": "LLM stream completed",
  "context": {
    "requestId": "1d743f3b-2b80-4411-bccb-9c218ede48b1",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "inputTokens": 0,
    "outputTokens": 0,
    "latencyMs": 7
  }
}
```

### Root Cause
The default Gemini model `gemini-1.5-flash` was outdated and not working properly with the current Google AI SDK version. The stream was completing immediately with 0 tokens, indicating a compatibility issue with the model name or API.

### Resolution
Updated the default Gemini model to `gemini-2.0-flash-exp` (the latest experimental model) across multiple files:

1. **Updated [`lib/llm/types.ts`](lib/llm/types.ts:1):**
   - Added pricing for `gemini-2.0-flash-exp`
   - Updated [`DEFAULT_MODELS`](lib/llm/types.ts:65) to use the new model

2. **Updated [`lib/llm/gemini.ts`](lib/llm/gemini.ts:1):**
   - Changed default model in [`streamGeminiChat()`](lib/llm/gemini.ts:21) from `gemini-1.5-flash` to `gemini-2.0-flash-exp`
   - Changed default model in [`generateGeminiChat()`](lib/llm/gemini.ts:75) from `gemini-1.5-flash` to `gemini-2.0-flash-exp`
   - Added error handling to catch and log stream errors

3. **Updated [`app/examples/chat/page.tsx`](app/examples/chat/page.tsx:1):**
   - Updated UI text from "Google Gemini 1.5 Flash" to "Google Gemini 2.0 Flash"

## Issue 3: OpenAI Model Update

### Description
Updated the default OpenAI model from `gpt-4o-mini` to `gpt-5-nano` for improved performance and cost efficiency.

### Resolution
Updated the default OpenAI model to `gpt-5-nano` across multiple files:

1. **Updated [`lib/llm/types.ts`](lib/llm/types.ts:1):**
   - Added pricing for `gpt-5-nano`
   - Updated [`DEFAULT_MODELS`](lib/llm/types.ts:65) to use the new model

2. **Updated [`lib/llm/openai.ts`](lib/llm/openai.ts:1):**
   - Changed default model in [`streamOpenAIChat()`](lib/llm/openai.ts:23) from `gpt-4o-mini` to `gpt-5-nano`
   - Changed default model in [`generateOpenAIChat()`](lib/llm/openai.ts:77) from `gpt-4o-mini` to `gpt-5-nano`

3. **Updated [`app/examples/chat/page.tsx`](app/examples/chat/page.tsx:1):**
   - Updated UI text from "OpenAI GPT-4o-mini" to "OpenAI GPT-5 Nano"

## Additional Improvements

### Enhanced Error Logging
Added logging in [`app/api/chat/stream/route.ts`](app/api/chat/stream/route.ts:60) to track when stream results are obtained:

```typescript
logger.info("Stream chat result obtained", {
  provider: result.provider,
  model: result.model,
});
```

### Better Error Handling in Gemini
Added try-catch blocks in [`lib/llm/gemini.ts`](lib/llm/gemini.ts:56) to properly handle and log stream errors:

```typescript
usage: (async () => {
  try {
    await result;
    return finalUsage;
  } catch (error) {
    console.error("Gemini usage tracking error:", error);
    throw error;
  }
})(),
```

## How It Works Now

### Local Development (`NODE_ENV=development`)
- **Environment Variables:** Read directly from `process.env` (`.env` file)
- **Database:** Local SQLite file (`local.db`)
- **Runtime:** Edge runtime
- **No Cloudflare credentials required for environment variables**

### Production Deployment (Cloudflare Workers)
- **Environment Variables:** Read from Cloudflare bindings
- **Database:** Cloudflare D1
- **Runtime:** Edge runtime
- **Cloudflare credentials required**

## Verification Steps

After applying the fixes:

1. **Test OpenAI:**
   ```bash
   curl -X POST http://localhost:3000/api/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"provider":"openai"}'
   ```

2. **Test Gemini:**
   ```bash
   curl -X POST http://localhost:3000/api/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"provider":"gemini"}'
   ```

3. **Test via UI:**
   - Visit `http://localhost:3000/examples/chat`
   - Select "OpenAI" from the dropdown and send a message
   - Select "Gemini" from the dropdown and send a message
   - Verify both providers return streaming responses

## Related Files Modified

- `lib/cloudflare.ts` - Added development fallback for environment variables
- `lib/llm/types.ts` - Updated default models and pricing
- `lib/llm/openai.ts` - Updated default model to gpt-5-nano
- `lib/llm/gemini.ts` - Updated default model to gemini-2.0-flash-exp and added error handling
- `app/api/chat/stream/route.ts` - Added logging for stream results
- `app/examples/chat/page.tsx` - Updated UI text for model names

## Prevention

When working with environment variables in edge runtime:

1. **Always check `NODE_ENV`:** Use `process.env.NODE_ENV === "development"` to determine if you're in local development
2. **Provide fallbacks:** For local development, fall back to `process.env` when Cloudflare bindings are unavailable
3. **Test both environments:** Verify that your code works in both local development and production
4. **Keep models updated:** Regularly check for new model versions and update defaults accordingly

## Model Pricing Reference

### OpenAI Models
- `gpt-5-nano`: $0.00015/1K input tokens, $0.0006/1K output tokens
- `gpt-4o-mini`: $0.00015/1K input tokens, $0.0006/1K output tokens
- `gpt-4o`: $0.0025/1K input tokens, $0.01/1K output tokens

### Gemini Models
- `gemini-2.0-flash-exp`: $0.000075/1K input tokens, $0.0003/1K output tokens
- `gemini-1.5-flash`: $0.000075/1K input tokens, $0.0003/1K output tokens
- `gemini-1.5-pro`: $0.00125/1K input tokens, $0.005/1K output tokens

## References

- Next.js Edge Runtime: https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
- @opennextjs/cloudflare Documentation: https://opennextjs.org/cloudflare
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Google AI Studio: https://aistudio.google.com/apikey
- OpenAI Platform: https://platform.openai.com/api-keys

Documented on: December 25, 2024
