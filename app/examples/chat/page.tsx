"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useChat } from "ai/react";

type Provider = "openai" | "gemini";

export default function ChatPage() {
  const [provider, setProvider] = useState<Provider>("openai");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages,
  } = useChat({
    api: "/api/chat/stream",
    body: { provider },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function clearChat() {
    setMessages([]);
  }

  return (
    <main className="mx-auto flex h-screen max-w-4xl flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-1 text-2xl font-bold">LLM Chat Demo</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="input w-32"
            disabled={isLoading}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>

          <button type="button" onClick={clearChat} className="btn btn-ghost text-sm" disabled={isLoading}>
            Clear
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <p className="font-medium">Error</p>
          <p>{error.message}</p>
          <button type="button" onClick={() => reload()} className="mt-2 text-red-600 underline dark:text-red-400">
            Try again
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg">Start a conversation</p>
              <p className="mt-1 text-sm">
                Using {provider === "openai" ? "OpenAI GPT-4o-mini" : "Google Gemini 1.5 Flash"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="input flex-1"
          disabled={isLoading}
        />
        {isLoading ? (
          <button type="button" onClick={stop} className="btn btn-danger">
            Stop
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>

      {/* Info box */}
      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        <p>
          <strong>Features:</strong> Real-time streaming • Token counting • Cost tracking •
          Multi-provider support
        </p>
        <p className="mt-1">
          Configure API keys in <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">.env</code>{" "}
          file: <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">OPENAI_API_KEY</code> and{" "}
          <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">GEMINI_API_KEY</code>
        </p>
      </div>
    </main>
  );
}
