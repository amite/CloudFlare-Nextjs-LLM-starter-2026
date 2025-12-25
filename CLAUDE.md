# CF Next LLM Boilerplate

Production-ready Next.js boilerplate for building LLM-powered applications on Cloudflare's edge network with real-time streaming, cost tracking, and optional Python microservice integration.

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.7
- **Framework**: Next.js 15.1 with App Router and Turbopack
- **Deployment**: Cloudflare Workers via OpenNext (@opennextjs/cloudflare)
- **Database**: SQLite with Drizzle ORM (local) and D1 (production)
- **Authentication**: Auth.js v5 with D1 adapter
- **LLM Integration**: Vercel AI SDK with OpenAI & Google Gemini support
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest with React Testing Library
- **Linting & Formatting**: Biome
- **Git Hooks**: Lefthook
- **Package Manager**: pnpm 9.15+

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/   # Auth.js dynamic routes
│   │   ├── chat/stream/          # LLM streaming endpoint
│   │   ├── counter/              # Counter CRUD API
│   │   ├── python/example/       # Python service proxy
│   │   └── usage/summary/        # Cost tracking endpoint
│   ├── auth/                     # Auth pages (signin, signup)
│   ├── dashboard/                # Protected dashboard (requires auth)
│   ├── examples/                 # Example pages
│   │   ├── chat/                 # LLM chat demo
│   │   └── counter/              # Counter CRUD demo
│   ├── globals.css               # Tailwind CSS imports
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Home page
├── components/                   # Reusable React components
│   ├── auth/                     # Auth-related components
│   ├── examples/                 # Example components
│   └── shared/                   # Shared UI components
├── lib/                          # Utility libraries & helpers
│   ├── auth/                     # Auth.js configuration
│   │   ├── config.ts             # Auth providers setup
│   │   └── index.ts              # Auth exports
│   ├── llm/                      # LLM integrations
│   │   ├── openai.ts             # OpenAI provider
│   │   ├── gemini.ts             # Google Gemini provider
│   │   ├── types.ts              # LLM types & pricing
│   │   └── index.ts              # LLM exports
│   ├── cloudflare.ts             # Cloudflare context helpers
│   ├── cost-tracker.ts           # Cost calculation & tracking
│   ├── db.ts                     # Database client (D1 & SQLite)
│   └── logger.ts                 # Structured logging
├── drizzle/                      # Database management
│   ├── schema/                   # Drizzle ORM schema definitions
│   ├── migrations/               # Auto-generated migration files
│   ├── migrate-local.ts          # Local migration runner
│   └── seed.ts                   # Database seeding script
├── python-services/              # Optional Python microservices
│   └── example-service/          # FastAPI example service
├── __tests__/                    # Unit & integration tests
├── artifacts/                    # Documentation & solutions
│   └── completed/issues/         # Issue documentation
├── .env.example                  # Environment variables template
├── biome.json                    # Biome formatter & linter config
├── docker-compose.yml            # Docker config for Python service
├── drizzle.config.ts             # Drizzle ORM configuration
├── lefthook.yml                  # Git hooks configuration
├── middleware.ts                 # Next.js middleware
├── next.config.ts                # Next.js configuration
├── open-next.config.ts           # OpenNext configuration
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Vitest configuration
├── wrangler.jsonc                # Cloudflare Workers config
└── package.json                  # Dependencies & scripts
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (with Turbopack)
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:check

# Code quality (lint + format)
pnpm check
pnpm check:fix

# Testing
pnpm test              # Run tests once
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run with coverage report

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Apply migrations to local DB
pnpm db:studio        # Open Drizzle Studio UI
pnpm db:seed          # Seed initial data
pnpm db:migrate:local # Run migrations locally

# Build & Deploy
pnpm build            # Build for production
pnpm preview          # Preview with Wrangler
pnpm deploy           # Deploy to Cloudflare Workers

# Python microservice (optional)
pnpm python:up        # Start with Docker
pnpm python:down      # Stop Docker service

# Database debugging
pnpm tsx scripts/debug-db.ts
```

## Architecture

### Code Organization

The project follows a **feature-based structure** with clear separation of concerns:

- **API Routes** (`app/api/`) - Server-side endpoints for data fetching, authentication, and external integrations
- **Pages** (`app/`, `app/auth/`, `app/dashboard/`, `app/examples/`) - User-facing views with authentication guards
- **Components** (`components/`) - Reusable React components organized by domain
- **Libraries** (`lib/`) - Core business logic, integrations, and utilities
- **Database** (`drizzle/`) - ORM schema, migrations, and seeding

### Key Patterns

1. **Environment-based Database Selection** (`lib/cloudflare.ts`, `lib/db.ts`):
   - Development: Uses local SQLite (`local.db`) via `better-sqlite3`
   - Production: Uses Cloudflare D1 via Drizzle ORM
   - The `getDatabase()` function automatically selects the appropriate database

2. **LLM Provider Abstraction** (`lib/llm/`):
   - Unified interface for multiple LLM providers
   - Supports OpenAI and Google Gemini
   - Includes cost tracking and token counting
   - Streaming responses via Vercel AI SDK

3. **Server-Side Auth** (Auth.js v5):
   - Configured in `lib/auth/config.ts`
   - Uses D1 adapter for persistence
   - Middleware-based protection in `middleware.ts`
   - Routes under `app/auth/` for signin/signup

4. **Cost Tracking** (`lib/cost-tracker.ts`):
   - Tracks API usage and costs
   - Model-based pricing lookup
   - Optional threshold alerts
   - Integrated with `/api/usage/summary` endpoint

5. **Structured Logging** (`lib/logger.ts`):
   - Configurable log levels
   - JSON formatting for production
   - Supports Cloudflare R2 integration (optional)

### Entry Points

- **Web**: `app/page.tsx` (home) → `app/layout.tsx` (root layout with auth provider)
- **API**: `app/api/chat/stream/route.ts` (LLM streaming), `app/api/counter/route.ts` (CRUD)
- **Auth**: `app/auth/signin/page.tsx` (login flow)
- **Server**: Cloudflare Workers via `@opennextjs/cloudflare` adapter

## Conventions

### Naming

- **Files**: kebab-case for files (`auth-guard.tsx`, `cost-tracker.ts`)
- **Directories**: lowercase with hyphens (`python-services/`, `__tests__/`)
- **Functions/Methods**: camelCase
- **Types/Interfaces**: PascalCase (`LLMMessage`, `CloudflareEnv`)
- **Constants**: UPPER_CASE for module-level constants
- **React Components**: PascalCase as default exports

### Code Style

- **Formatter**: Biome (configured in `biome.json`)
- **Linter**: Biome with strict rules
- **TypeScript**: Strict mode enabled, ES2022 target
- **Imports**: Path aliases via `@/` pointing to project root

### Testing

- **Framework**: Vitest (compatible with Jest)
- **File Pattern**: `__tests__/` directory or `.test.ts`/`.spec.ts` suffix
- **Components**: React Testing Library with `@testing-library/jest-dom`
- **Running**: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`

## Important Files

| File | Purpose |
|------|---------|
| `lib/cloudflare.ts` | Cloudflare context & environment helpers |
| `lib/db.ts` | Database client factory (D1/SQLite) |
| `lib/llm/types.ts` | LLM types and model pricing |
| `lib/cost-tracker.ts` | Cost calculation and tracking |
| `lib/auth/config.ts` | Auth.js configuration with D1 adapter |
| `drizzle/schema/` | Database schema definitions |
| `middleware.ts` | Auth middleware for route protection |
| `app/api/chat/stream/route.ts` | LLM streaming endpoint |
| `app/api/counter/route.ts` | Counter CRUD API example |
| `next.config.ts` | Next.js configuration with OpenNext setup |
| `wrangler.jsonc` | Cloudflare Workers configuration |

## Environment Variables

```env
# Required
AUTH_SECRET=<generated-secret>
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Optional - LLM
DEFAULT_LLM_PROVIDER=openai  # or "gemini"

# Optional - OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Optional - Python Service
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_SERVICE_SECRET=dev-secret

# Optional - Logging & Cost
LOG_LEVEL=info  # debug, info, warn, error
ENABLE_COST_TRACKING=true
COST_ALERT_THRESHOLD=10.00

# Optional - App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

Defined in `drizzle/schema/`:
- **users** - User accounts
- **accounts** - OAuth provider accounts
- **sessions** - Session tokens
- **verificationTokens** - Email verification
- **authenticators** - WebAuthn credentials
- **counters** - Counter example data
- **usageMetrics** - API usage tracking

## Notes for Claude

### Python Script Execution Rule

**IMPORTANT**: Always use `uv run` for executing Python scripts and microservices, never use `python` or `python3` directly. Examples:
```bash
python some_script.py                    # WRONG - always use uv run
python3 some_script.py                   # WRONG - always use uv run

# CORRECT usage:
uv run some_script.py
uv run python-services/example-service/src/main.py
```

This ensures consistent Python environment management across the project.

### Development Mode Special Handling

- The `/api/counter` endpoint explicitly uses Node.js runtime (`export const runtime = "nodejs"`) because it uses `better-sqlite3`
- In production on Cloudflare Workers, all endpoints automatically use edge runtime with D1
- If you see edge runtime errors during development, the fix is to restart the dev server after any runtime config changes

### LLM Integration Details

- The Vercel AI SDK (`ai` package) handles streaming and response formatting
- Both OpenAI and Gemini providers go through a unified interface
- Cost tracking happens via token counts returned by the LLM API
- Default models: OpenAI `gpt-5-nano`, Gemini `gemini-2.0-flash-exp`

### Authentication Flow

- Uses Auth.js v5 (NextAuth) with D1 adapter
- Demo credentials: `demo@example.com` / `password123`
- Protected routes use middleware that checks session validity
- Dashboard (`/dashboard`) requires authentication

### Python Service Integration

- Optional FastAPI microservice in `python-services/example-service/`
- Accessible via `/api/python/example` endpoint
- Can be run via Docker Compose or locally with uv
- Returns 503 if not configured

### Testing & Quality Checks

- Pre-commit hooks via Lefthook run: `biome lint`, `biome format`, `type-check`
- Tests use Vitest with jsdom environment
- Coverage reports available via `pnpm test:coverage`

### Deployment to Cloudflare

1. Database ID goes in `wrangler.jsonc`
2. Secrets set via `wrangler secret put`
3. Migrations applied with `wrangler d1 migrations apply`
4. Deploy with `pnpm deploy`
5. Workers run at `https://<project>.<subdomain>.workers.dev`
