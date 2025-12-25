# Authentication Files Reference

This document provides a complete file map for all authentication-related code in the project. Use this as a quick reference when discussing or modifying auth functionality.

---

## Core Configuration Files

### `lib/auth/config.ts`
**Purpose**: Base Auth.js configuration without database adapter
**Key Content**:
- Auth.js provider setup (GitHub, Google, Credentials)
- Credentials schema validation with Zod
- Demo user logic
- Callback functions
- Sign-in/error page routes

**Lines of Interest**:
- OAuth providers configuration (GitHub, Google)
- Credentials provider with demo user check
- `credentialsSchema` validation rules
- `authorized()` callback for middleware

### `lib/auth/index.ts`
**Purpose**: Complete Auth.js configuration with Drizzle adapter
**Key Content**:
- `createAuth()` function that accepts CloudflareEnvWithSecrets
- Database selection logic (dev SQLite vs. prod D1)
- Drizzle adapter instantiation
- JWT callback implementation
- Session callback implementation

**Lines of Interest**:
- Database selection logic
- `DrizzleAdapter` configuration
- `callbacks.jwt()` - adds user ID to token
- `callbacks.session()` - adds token to session

---

## Route Handlers

### `app/api/auth/[...nextauth]/route.ts`
**Purpose**: Auth.js dynamic route handler for all auth endpoints
**Key Content**:
- `export const runtime = "nodejs"` (required for D1 adapter)
- `createAuth()` instantiation with environment
- GET and POST handler routing
- Error handling

**Lines of Interest**:
- Runtime declaration (Node.js not edge)
- Request routing to handlers
- Environment initialization

---

## Page Components

### `app/auth/signin/page.tsx`
**Purpose**: Sign-in page UI
**Key Content**:
- OAuth sign-in buttons (GitHub, Google)
- Credentials form (email, password)
- Form validation
- Demo credentials display
- Error message handling
- Loading state management

**Lines of Interest**:
- `signIn()` calls for different providers
- Form submission handling
- Credential validation
- Error display logic

### `app/auth/error/page.tsx`
**Purpose**: Auth error display page
**Key Content**:
- Error code from URL query parameter
- Error message mapping
- Debug information
- Links to retry signin

**Lines of Interest**:
- Error code handling
- Error message translation
- Debug section content

### `app/dashboard/page.tsx`
**Purpose**: Protected dashboard after authentication
**Key Content**:
- User session access
- Welcome message
- Sign-out button
- Educational auth content
- Links to example features

**Lines of Interest**:
- `getSession()` usage
- User data display
- Protected route example

---

## Components

### `components/auth/sign-out-button.tsx`
**Purpose**: Reusable sign-out button component
**Key Content**:
- Client-side component
- `signOut()` function call
- Loading state with spinner
- Button styling

**Lines of Interest**:
- `signOut({ callbackUrl: "/" })` call
- Loading state management
- Error handling

---

## Middleware

### `middleware.ts`
**Purpose**: Edge-compatible auth middleware for route protection
**Key Content**:
- Auth.js middleware wrapper
- Route matcher configuration
- Protected route paths
- Redirect logic for unauthenticated users

**Lines of Interest**:
- Route matcher patterns
- Protected routes definition
- `authorized()` callback usage

---

## Database Schema

### `drizzle/schema/users.ts`
**Purpose**: Drizzle ORM schema for all auth tables
**Key Content**:
- `users` table definition
- `accounts` table (OAuth provider accounts)
- `sessions` table (JWT sessions)
- `verificationTokens` table (email verification)
- `authenticators` table (WebAuthn/passkeys)
- Table relationships and foreign keys
- Cascade delete configurations

**Tables Defined**:
1. **users** - User accounts and profile data
2. **accounts** - OAuth provider connections
3. **sessions** - Session tokens
4. **verificationTokens** - Email verification tokens
5. **authenticators** - WebAuthn credentials

**Lines of Interest**:
- Foreign key relationships
- Cascade delete rules
- Index definitions
- Data type specifications

### `drizzle/schema/index.ts`
**Purpose**: Exports all schema tables
**Key Content**:
- Re-exports from users.ts
- Used by adapter in lib/auth/index.ts

---

## Database Utilities

### `lib/db.ts`
**Purpose**: Database client factory and connection management
**Key Content**:
- `getDatabase()` function - selects SQLite or D1
- Local SQLite database initialization
- Cloudflare D1 database initialization
- Connection pooling (if applicable)

**Lines of Interest**:
- Development vs. production database selection
- Database initialization logic

### `lib/cloudflare.ts`
**Purpose**: Cloudflare environment and context helpers
**Key Content**:
- `getEnv()` function for environment variables
- `CloudflareEnvWithSecrets` type definition
- Environment variable parsing
- Secrets access for Auth.js

**Lines of Interest**:
- Environment variable mapping
- Secrets configuration
- Type definitions for Cloudflare context

---

## Testing & Example Files

### `__tests__/`
**Purpose**: Test files for auth functionality
**Content**: Unit and integration tests for:
- Sign-in flow
- Session management
- Protected routes
- Error handling

**Relevant Test Files** (if present):
- `__tests__/auth.test.ts` - Auth functionality tests
- `__tests__/middleware.test.ts` - Middleware tests
- `__tests__/protected-routes.test.ts` - Route protection tests

---

## Configuration Files

### `.env.example`
**Purpose**: Environment variables template
**Auth-Related Variables**:
```env
AUTH_SECRET=                    # JWT secret
OPENAI_API_KEY=                # LLM (required for app)
GEMINI_API_KEY=                # LLM (required for app)
GITHUB_CLIENT_ID=              # OAuth
GITHUB_CLIENT_SECRET=          # OAuth
GOOGLE_CLIENT_ID=              # OAuth
GOOGLE_CLIENT_SECRET=          # OAuth
NEXTAUTH_URL=                  # Callback base URL
NEXTAUTH_URL_INTERNAL=         # Internal callback URL
LOG_LEVEL=                     # For auth debugging
```

### `next.config.ts`
**Purpose**: Next.js configuration
**Auth-Related Content**:
- OpenNext adapter setup
- Cloudflare Workers configuration
- Middleware configuration

### `wrangler.jsonc`
**Purpose**: Cloudflare Workers configuration
**Auth-Related Content**:
- D1 database bindings
- Environment variables
- Secrets configuration
- Deployment settings

### `drizzle.config.ts`
**Purpose**: Drizzle ORM configuration
**Content**:
- Schema path
- Migration output directory
- Database selection for drizzle-kit
- Auth-related schema references

---

## Package Dependencies

Key auth-related dependencies (from `package.json`):

| Package | Version | Purpose |
|---------|---------|---------|
| `next-auth` | ^5.x | Authentication framework |
| `@auth/core` | Latest | Auth.js core |
| `@auth/d1-adapter` | Latest | Cloudflare D1 adapter |
| `@auth/drizzle-adapter` | Latest | Drizzle ORM adapter |
| `drizzle-orm` | Latest | Database ORM |
| `drizzle-kit` | Latest | Migration tools |
| `better-sqlite3` | Latest | Local SQLite (dev) |
| `zod` | Latest | Schema validation |

---

## Data Flow Diagram

```
User Request
    ↓
middleware.ts (JWT validation)
    ↓
┌─────────────────────────────────────────┐
│ Protected Route?                        │
├─────────────────────────────────────────┤
│ YES → Check session → Allow/Redirect    │
│ NO  → Allow access                      │
└─────────────────────────────────────────┘
    ↓
User visits /auth/signin
    ↓
app/auth/signin/page.tsx (UI)
    ↓
signIn() or OAuth provider
    ↓
app/api/auth/[...nextauth]/route.ts
    ↓
lib/auth/index.ts (createAuth)
    ↓
Provider authorization:
  ├─ GitHub → OAuth flow
  ├─ Google → OAuth flow
  └─ Credentials → authorize() callback
    ↓
lib/auth/config.ts (provider logic)
    ↓
Create/update user in database
    ↓
drizzle/schema/users.ts (stores in DB)
    ↓
JWT token created
    ↓
httpOnly cookie set
    ↓
Redirect to /dashboard
    ↓
middleware.ts validates JWT
    ↓
app/dashboard/page.tsx (protected page)
```

---

## Environment Variable Map

| Variable | Used In | Purpose |
|----------|---------|---------|
| `AUTH_SECRET` | `lib/auth/index.ts` | JWT signing key |
| `GITHUB_CLIENT_ID` | `lib/auth/config.ts` | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | `lib/auth/config.ts` | GitHub OAuth |
| `GOOGLE_CLIENT_ID` | `lib/auth/config.ts` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `lib/auth/config.ts` | Google OAuth |
| `NEXTAUTH_URL` | Auth.js | Callback base URL |
| `NEXTAUTH_URL_INTERNAL` | Auth.js | Internal callback URL |
| `LOG_LEVEL` | `lib/logger.ts` | Logging verbosity |
| `NODE_ENV` | `lib/auth/index.ts` | DB selection (dev/prod) |

---

## Database Connection Flow

### Development
```
middleware.ts / app/api/auth/[...nextauth]/route.ts
    ↓
lib/auth/index.ts (createAuth)
    ↓
lib/cloudflare.ts (getEnv)
    ↓
lib/db.ts (getDatabase - dev)
    ↓
better-sqlite3 (./local.db)
    ↓
drizzle/schema/users.ts
```

### Production (Cloudflare Workers)
```
Edge Request → middleware.ts / Route Handler
    ↓
lib/auth/index.ts (createAuth)
    ↓
lib/cloudflare.ts (getEnv with D1 bindings)
    ↓
lib/db.ts (getDatabase - prod)
    ↓
Cloudflare D1 (wrangler.jsonc bindings)
    ↓
drizzle/schema/users.ts
```

---

## Common Modifications

### Add New OAuth Provider
1. Edit: `lib/auth/config.ts` - Add provider
2. Edit: `.env.example` - Add credentials
3. Test: Visit signin page and verify button

### Add Email Verification
1. Edit: `drizzle/schema/users.ts` - Modify schema
2. Edit: `lib/auth/config.ts` - Add verification logic
3. Create: Email service integration
4. Edit: `app/auth/signin/page.tsx` - Update UI

### Add 2FA
1. Edit: `drizzle/schema/users.ts` - Add 2FA fields
2. Edit: `app/auth/signin/page.tsx` - Add 2FA form
3. Create: TOTP verification logic

### Customize Sessions
1. Edit: `lib/auth/index.ts` - Modify JWT callback
2. Edit: `lib/auth/config.ts` - Adjust session duration
3. Test: Verify session persistence

---

## Testing Checklist

When modifying auth code, verify:

- [ ] Sign in with GitHub works
- [ ] Sign in with Google works
- [ ] Sign in with demo credentials works
- [ ] Redirect to signin when accessing /dashboard
- [ ] Redirect to dashboard after sign in
- [ ] Sign out works and clears session
- [ ] Protected routes return 401 without token
- [ ] Session persists between page reloads
- [ ] Dev database (/local.db) works
- [ ] Type checking passes: `pnpm type-check`
- [ ] Linting passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`

---

## See Also

- Main auth documentation: [Auth-1-0.md](Auth-1-0.md)
- README section: [Authentication Documentation](../../README.md#authentication-documentation)
- CLAUDE.md authentication notes: [CLAUDE.md](../../CLAUDE.md#authentication-flow)
