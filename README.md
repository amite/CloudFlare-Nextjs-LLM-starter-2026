# CF Next LLM Boilerplate

> Production-ready Next.js boilerplate for Cloudflare Workers with D1, Auth.js, and LLM integration

A comprehensive boilerplate for building LLM-powered applications on Cloudflare's edge network with Next.js 15, featuring real-time streaming, cost tracking, and optional Python microservice integration.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   User Browser  │────▶│   Cloudflare Workers (Next.js App)   │
└─────────────────┘     └──────────────────────────────────────┘
                                        │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
    ┌──────────┐               ┌──────────────┐            ┌──────────────┐
    │ D1 (DB)  │               │  OpenAI API  │            │  Gemini API  │
    └──────────┘               └──────────────┘            └──────────────┘
          │                                                       │
          ▼                                                       ▼
    ┌──────────┐                                         ┌────────────────┐
    │ R2 (Logs)│                                         │ Python Service │
    └──────────┘                                         │   (Optional)   │
                                                         └────────────────┘
```

## Features

- ✅ **Next.js 15** with App Router and Turbopack
- ✅ **Cloudflare Workers** deployment via OpenNext
- ✅ **D1 Database** (SQLite) with Drizzle ORM
- ✅ **Auth.js** (NextAuth.js v5) with D1 adapter
- ✅ **LLM Streaming** with OpenAI & Google Gemini via Vercel AI SDK
- ✅ **Cost Tracking** & structured logging
- ✅ **TypeScript** strict mode
- ✅ **Tailwind CSS v4** for styling
- ✅ **Biome** for linting & formatting
- ✅ **Lefthook** for git hooks
- ✅ **Vitest** for testing
- ✅ **Docker Compose** for local development
- ✅ **Python Microservices** (FastAPI with uv) - optional

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- (Optional) Docker for Python services
- (Optional) uv for Python development

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/cf-next-llm-boilerplate.git
cd cf-next-llm-boilerplate

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Generate AUTH_SECRET
openssl rand -base64 32
# Add the output to .env as AUTH_SECRET=<value>
```

### 3. Add Your API Keys

Edit `.env` and add your API keys:

```env
# Required for LLM features
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Required for auth
AUTH_SECRET=<generated-secret>
```

### 4. Database Setup

> **Note:** If you encounter index conflict errors during `db:push`, see the [Troubleshooting](#troubleshooting) section.

```bash
# Generate database migrations
pnpm db:generate

# Push schema to local SQLite
pnpm db:push

# Seed initial data
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Open http://localhost:3000 to see the app.

---

## Testing the Boilerplate

### Step-by-Step Verification

#### Test 1: Home Page
```bash
# Start the dev server
pnpm dev

# Visit http://localhost:3000
# You should see the home page with feature list and quick start guide
```

#### Test 2: Counter Example (Database CRUD)
```bash
# Visit http://localhost:3000/examples/counter
# Click the + and - buttons
# The counter value should update and persist between page refreshes

# Verify database operation via API:
curl http://localhost:3000/api/counter
# Should return: {"id":1,"name":"default","value":...}
```

> **Note:** The counter uses local SQLite database in development mode. If you encounter edge runtime errors, see the [Troubleshooting](#troubleshooting) section.

#### Test 3: LLM Chat (OpenAI)
```bash
# Make sure OPENAI_API_KEY is set in .env

# Visit http://localhost:3000/examples/chat
# Select "OpenAI" from the dropdown
# Type a message and press Send
# You should see streaming response

# Or test via API:
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in 5 words"}],"provider":"openai"}'
```

#### Test 4: LLM Chat (Gemini)
```bash
# Make sure GEMINI_API_KEY is set in .env

# Visit http://localhost:3000/examples/chat
# Select "Gemini" from the dropdown
# Type a message and press Send

# Or test via API:
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in 5 words"}],"provider":"gemini"}'
```

#### Test 5: Authentication
```bash
# Visit http://localhost:3000/auth/signin
# Use demo credentials: demo@example.com / password123
# After login, you should be redirected to /dashboard

# Or try visiting /dashboard directly (should redirect to signin)
```

#### Test 6: Run Tests
```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode during development
pnpm test:watch
```

#### Test 7: Type Checking & Linting
```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format

# Check all (lint + format)
pnpm check
```

---

## Testing with Python Microservice

### Option A: Using Docker (Recommended)

```bash
# 1. Start Python service with Docker
pnpm python:up

# 2. Verify Python service is running
curl http://localhost:8000/health
# Should return: {"status":"healthy","timestamp":"...","version":"0.1.0"}

# 3. Add Python service config to .env
echo 'PYTHON_SERVICE_URL=http://localhost:8000' >> .env
echo 'PYTHON_SERVICE_SECRET=dev-secret' >> .env

# 4. Test the integration via Next.js
curl http://localhost:3000/api/python/example
# Should return health status from Python service

# 5. Test processing endpoint
curl -X POST http://localhost:3000/api/python/example \
  -H "Content-Type: application/json" \
  -d '{"data":"hello world"}'
# Should return: {"result":"HELLO WORLD","processed_at":"..."}

# 6. Stop Python service when done
pnpm python:down
```

### Option B: Using uv (Local Development)

```bash
# 1. Install uv if not installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Navigate to Python service
cd python-services/example-service

# 3. Create virtual environment and install
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"

# 4. Run the service
uvicorn src.main:app --reload --port 8000

# 5. In another terminal, test the integration
# (Same curl commands as Docker option above)
```

### Testing Without Python Service

If you don't need Python integration:

```bash
# 1. Don't set PYTHON_SERVICE_* env vars

# 2. The /api/python/example endpoint will return 503:
curl http://localhost:3000/api/python/example
# Returns: {"error":"Python service not configured"}

# 3. All other features work normally without Python
```

---

## Project Structure

```
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── auth/[...nextauth]/ # Auth.js routes
│   │   ├── chat/stream/        # LLM streaming endpoint
│   │   ├── counter/            # Counter CRUD API
│   │   ├── python/example/     # Python service proxy
│   │   └── usage/summary/      # Cost tracking endpoint
│   ├── auth/                   # Auth pages
│   ├── dashboard/              # Protected dashboard
│   ├── examples/               # Example pages
│   │   ├── chat/               # LLM chat demo
│   │   └── counter/            # Counter demo
│   ├── globals.css             # Tailwind CSS
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/                 # React components
├── drizzle/                    # Database
│   ├── schema/                 # Drizzle schemas
│   ├── migrations/             # Migration files
│   └── seed.ts                 # Seed script
├── lib/                        # Utility libraries
│   ├── auth/                   # Auth configuration
│   ├── llm/                    # LLM integrations
│   ├── cloudflare.ts           # Cloudflare context
│   ├── cost-tracker.ts         # Cost tracking
│   ├── db.ts                   # Database client
│   └── logger.ts               # Structured logger
├── python-services/            # Optional Python services
│   └── example-service/        # FastAPI example
├── __tests__/                  # Test files
├── .env.example                # Environment template
├── biome.json                  # Biome config
├── docker-compose.yml          # Docker config
├── drizzle.config.ts           # Drizzle config
├── lefthook.yml                # Git hooks config
├── next.config.ts              # Next.js config
├── open-next.config.ts         # OpenNext config
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Vitest config
└── wrangler.jsonc              # Cloudflare config
```

---

## Deployment to Cloudflare Workers

### 1. Create Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create cf-next-llm-db
# Copy the database_id from output

# Create R2 bucket for logs (optional)
wrangler r2 bucket create cf-next-llm-logs
```

### 2. Update Configuration

Edit `wrangler.jsonc` with your database ID:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cf-next-llm-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

### 3. Set Secrets

```bash
# Required
wrangler secret put AUTH_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY

# Optional (if using Python service)
wrangler secret put PYTHON_SERVICE_URL
wrangler secret put PYTHON_SERVICE_SECRET

# Optional (for OAuth)
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

### 4. Run Migrations

```bash
# Set D1 credentials in .env for drizzle-kit
# CLOUDFLARE_ACCOUNT_ID=...
# CLOUDFLARE_DATABASE_ID=...
# CLOUDFLARE_D1_TOKEN=...

# Generate and apply migrations
pnpm db:generate
wrangler d1 migrations apply cf-next-llm-db --remote
```

### 5. Deploy

```bash
pnpm deploy
```

Your app will be available at `https://cf-next-llm-app.<your-subdomain>.workers.dev`

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm preview` | Build and preview with Wrangler |
| `pnpm deploy` | Deploy to Cloudflare Workers |
| `pnpm lint` | Run Biome linter |
| `pnpm format` | Format code with Biome |
| `pnpm check` | Run all Biome checks |
| `pnpm type-check` | TypeScript type checking |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database |
| `pnpm python:up` | Start Python service |
| `pnpm python:down` | Stop Python service |
| `pnpm tsx scripts/debug-db.ts` | Debug database connectivity and test operations |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Auth.js secret (generate with `openssl rand -base64 32`) |
| `OPENAI_API_KEY` | For OpenAI | OpenAI API key |
| `GEMINI_API_KEY` | For Gemini | Google Gemini API key |
| `DEFAULT_LLM_PROVIDER` | No | Default provider (`openai` or `gemini`) |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | For OAuth | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | For OAuth | GitHub OAuth client secret |
| `PYTHON_SERVICE_URL` | For Python | Python service URL |
| `PYTHON_SERVICE_SECRET` | For Python | Python service auth secret |
| `LOG_LEVEL` | No | Logging level (`debug`, `info`, `warn`, `error`) |
| `ENABLE_COST_TRACKING` | No | Enable cost tracking (`true`/`false`) |

---

## Troubleshooting

### Database Issues

#### Index already exists error
If you see `SqliteError: index authenticators_credentialID_unique already exists` during `pnpm db:push`, it means your local database schema has become inconsistent with Drizzle's tracking. This often happens if the database was modified outside of Drizzle or if a push was interrupted.

**Fix:** The simplest solution is to reset the local database:
```bash
rm local.db
pnpm db:push
pnpm db:seed
```

#### General Reset
```bash
# Reset local database
rm -f local.db
pnpm db:push
pnpm db:seed
```

### Edge Runtime Error in Local Development

If you see `The edge runtime does not support Node.js 'fs' module` error when accessing the counter example:

**Cause:** This error occurs when an API route is configured to use edge runtime but tries to use Node.js modules (like `better-sqlite3`) that aren't available in edge runtime.

**Fix:** The counter API route has been configured to use Node.js runtime in development. If you encounter this error:

1. **Restart the development server** (required after runtime changes):
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

2. **Verify the runtime configuration** in `app/api/counter/route.ts`:
   ```typescript
   export const runtime = "nodejs";  // Not "edge"
   ```

3. **Test the counter**:
   ```bash
   curl http://localhost:3000/api/counter
   ```

**How it works:**
- **Development:** Uses Node.js runtime with local SQLite database (`local.db`)
- **Production:** Uses edge runtime with Cloudflare D1 database
- The `getDatabase()` function in `lib/cloudflare.ts` automatically selects the appropriate database

For more details, see [`artifacts/completed/issues/counter-edge-runtime-error.md`](artifacts/completed/issues/counter-edge-runtime-error.md).

### Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Clear OpenNext build
rm -rf .open-next

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Wrangler Issues

```bash
# Check Wrangler version
wrangler --version

# Update Wrangler
pnpm add -D wrangler@latest

# Check Cloudflare account
wrangler whoami
```

---

## License

MIT

---

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

---

Built with ❤️ using Next.js, Cloudflare Workers, and the Vercel AI SDK.
