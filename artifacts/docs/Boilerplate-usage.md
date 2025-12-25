Summary: CF Next LLM Boilerplate Complete
I've created a comprehensive Next.js boilerplate for Cloudflare Workers with the following:

Core Stack

Next.js 15 with App Router and Turbopack
OpenNext Cloudflare adapter for Workers deployment
Drizzle ORM with SQLite (local) / D1 (production)
Auth.js (NextAuth v5) with D1 adapter
Tailwind CSS v4 for styling
Zod v4 for validation
Key Features
LLM Streaming with OpenAI & Gemini via Vercel AI SDK
Cost Tracking with database logging
Structured Logging in JSON format
Python Microservice template with FastAPI and uv
Dev Tools
Biome for linting/formatting
Lefthook for git hooks
Vitest for testing
Docker Compose for Python services
Testing Instructions
Quick Start (Without Python)

# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Add your API keys: OPENAI_API_KEY, GEMINI_API_KEY
# Generate: openssl rand -base64 32 → AUTH_SECRET

# 3. Setup database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Start dev server
pnpm dev

# 5. Test endpoints:
# - Home: http://localhost:3000
# - Counter: http://localhost:3000/examples/counter
# - Chat: http://localhost:3000/examples/chat
# - Auth: http://localhost:3000/auth/signin
With Python Microservice

# Start Python service
pnpm python:up

# Add to .env:
# PYTHON_SERVICE_URL=http://localhost:8000
# PYTHON_SERVICE_SECRET=dev-secret

# Test: curl http://localhost:3000/api/python/example

# Stop when done
pnpm python:down
Run Tests

pnpm test        # Run tests
pnpm type-check  # Type check
pnpm check       # Lint + format
pnpm python:down
