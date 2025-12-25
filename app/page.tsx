import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight">CF Next LLM Boilerplate</h1>

        <p className="text-lg text-gray-600 dark:text-gray-400">
          A production-ready Next.js boilerplate for Cloudflare Workers with D1 database, Auth.js
          authentication, and LLM integration (OpenAI & Gemini).
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/examples/chat" className="btn btn-primary">
            Try LLM Chat Demo
          </Link>
          <Link href="/examples/counter" className="btn btn-secondary">
            View Counter Example
          </Link>
          <Link href="/dashboard" className="btn btn-outline">
            Go to Dashboard
          </Link>
        </div>

        <section className="card mt-4">
          <h2 className="mb-4 text-xl font-semibold">Features</h2>
          <ul className="grid gap-2 text-gray-700 dark:text-gray-300">
            <li>✅ Next.js 15 with App Router</li>
            <li>✅ Cloudflare Workers deployment via OpenNext</li>
            <li>✅ D1 (SQLite) database with Drizzle ORM</li>
            <li>✅ Auth.js (NextAuth.js) authentication</li>
            <li>✅ LLM streaming (OpenAI & Gemini) with Vercel AI SDK</li>
            <li>✅ Cost tracking & structured logging</li>
            <li>✅ TypeScript strict mode</li>
            <li>✅ Biome for linting & formatting</li>
            <li>✅ Git hooks with Lefthook</li>
            <li>✅ Docker Compose for local development</li>
            <li>✅ Optional Python microservices (FastAPI with uv)</li>
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-semibold">Quick Start</h2>
          <div className="code-block">
            <pre className="text-gray-800 dark:text-gray-200">
              {`# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Add your API keys to .env
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...

# 4. Generate database migrations
pnpm db:generate

# 5. Run migrations locally
pnpm db:push

# 6. Seed the database
pnpm db:seed

# 7. Start development server
pnpm dev`}
            </pre>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-semibold">Deployment</h2>
          <div className="code-block">
            <pre className="text-gray-800 dark:text-gray-200">
              {`# 1. Create D1 database
wrangler d1 create cf-next-llm-db

# 2. Update wrangler.jsonc with database_id

# 3. Set secrets
wrangler secret put AUTH_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY

# 4. Deploy
pnpm deploy`}
            </pre>
          </div>
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-6 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <p>
            Built with Next.js, Cloudflare Workers, and the Vercel AI SDK.
            <br />
            <a
              href="https://github.com/your-username/cf-next-llm-boilerplate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              View on GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
