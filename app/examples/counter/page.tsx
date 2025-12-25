"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";

interface Counter {
  id: number;
  name: string;
  value: number;
  updatedAt: string;
}

export default function CounterPage() {
  const [counter, setCounter] = useState<Counter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch counter on mount
  useEffect(() => {
    fetchCounter();
  }, []);

  async function fetchCounter() {
    try {
      const res = await fetch("/api/counter");
      if (!res.ok) throw new Error("Failed to fetch counter");
      const data = await res.json();
      setCounter(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function updateCounter(action: "increment" | "decrement") {
    startTransition(async () => {
      // Optimistic update
      if (counter) {
        setCounter({
          ...counter,
          value: action === "increment" ? counter.value + 1 : counter.value - 1,
        });
      }

      try {
        const res = await fetch("/api/counter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) throw new Error("Failed to update counter");
        const data = await res.json();
        setCounter(data);
        setError(null);
      } catch (err) {
        // Revert on error
        fetchCounter();
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ← Back to Home
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">Counter Example</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        This example demonstrates CRUD operations with D1/SQLite using Drizzle ORM and Server
        Actions with optimistic updates.
      </p>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <span className="block text-6xl font-bold tabular-nums">
              {counter?.value ?? "-"}
            </span>
            <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">
              Counter: {counter?.name ?? "loading..."}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateCounter("decrement")}
              disabled={isPending}
              className="btn btn-secondary h-12 w-12 text-xl"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => updateCounter("increment")}
              disabled={isPending}
              className="btn btn-primary h-12 w-12 text-xl"
            >
              +
            </button>
          </div>

          {counter?.updatedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last updated: {new Date(counter.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h2 className="mb-2 font-semibold">How it works</h2>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>
            • Data is stored in <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">D1</code>{" "}
            (Cloudflare) or{" "}
            <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">SQLite</code> (local)
          </li>
          <li>
            • <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">Drizzle ORM</code> provides
            type-safe database operations
          </li>
          <li>• Optimistic updates for instant UI feedback</li>
          <li>• API routes handle the database operations</li>
        </ul>
      </div>
    </main>
  );
}
