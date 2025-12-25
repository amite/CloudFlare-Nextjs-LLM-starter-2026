import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-gray-500 text-sm hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ← Back to Home
        </Link>
      </div>

      <h1 className="mb-2 font-bold text-3xl">Dashboard</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        This is a protected page. You need to be authenticated to view this content.
      </p>

      <div className="card">
        <h2 className="mb-4 font-semibold text-xl">Welcome!</h2>
        <p className="text-gray-600 dark:text-gray-400">
          You are logged in. This page demonstrates protected routes with Auth.js middleware.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/examples/chat" className="btn btn-primary">
            Try Chat Demo
          </Link>
          <Link href="/examples/counter" className="btn btn-secondary">
            View Counter
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="mb-2 font-semibold">How Authentication Works</h3>
        <ul className="space-y-1 text-gray-600 text-sm dark:text-gray-400">
          <li>
            • Auth.js handles authentication via{" "}
            <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">/api/auth/*</code> routes
          </li>
          <li>
            • Middleware at{" "}
            <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">middleware.ts</code>{" "}
            protects the{" "}
            <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">/dashboard</code> route
          </li>
          <li>• Sessions are stored in JWT tokens (Edge-compatible)</li>
          <li>• User data can be stored in D1 using the D1 adapter</li>
        </ul>
      </div>
    </main>
  );
}
