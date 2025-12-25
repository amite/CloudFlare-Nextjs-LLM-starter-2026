# Authentication System Documentation

## Overview

This app implements a production-ready authentication system using **Auth.js v5** (NextAuth.js) with edge runtime compatibility. The system supports multiple authentication methods (OAuth via GitHub/Google and credentials-based authentication) with session persistence in SQLite (development) or Cloudflare D1 (production).

---

## Quick Start

### Demo Credentials

Test the authentication flow immediately with demo credentials:
- **Email**: `demo@example.com`
- **Password**: `password123`

Visit [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin) and use these credentials to log in.

### Protected Routes

After authentication, access protected routes:
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard) - Requires authentication
- **Protected API**: `/api/protected/*` - Requires valid session

---

## Authentication Methods

### 1. OAuth Providers

Two OAuth providers are supported: GitHub and Google. Users can sign in using their existing accounts.

#### GitHub OAuth

```typescript
// Configuration in lib/auth/config.ts
GitHub({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
})
```

**Setup Requirements:**
1. Create OAuth app at [GitHub Settings](https://github.com/settings/developers)
2. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github` (dev) or `https://<your-workers-domain>/api/auth/callback/github` (prod)
3. Add credentials to `.env`:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

#### Google OAuth

```typescript
// Configuration in lib/auth/config.ts
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
})
```

**Setup Requirements:**
1. Create OAuth app at [Google Cloud Console](https://console.cloud.google.com)
2. Set Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (dev) or `https://<your-workers-domain>/api/auth/callback/google` (prod)
3. Add credentials to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### 2. Credentials (Email/Password)

The credentials provider enables email/password authentication with basic validation:
- **Email**: Must be valid email format
- **Password**: Minimum 8 characters

**Implementation Location**: `lib/auth/config.ts` (lines 58-65)

```typescript
Credentials({
  name: "credentials",
  async authorize(credentials) {
    const parsed = credentialsSchema.safeParse(credentials);
    if (!parsed.success) return null;

    // Currently returns demo user for testing
    if (
      parsed.data.email === "demo@example.com" &&
      parsed.data.password === "password123"
    ) {
      return {
        id: "demo-user-id",
        email: parsed.data.email,
        name: "Demo User",
      };
    }

    return null; // Auth failed
  },
})
```

**⚠️ Important Production Note:**
The credentials provider currently returns a hardcoded demo user for testing. In production, you must:
1. Implement proper password hashing (e.g., bcrypt or argon2)
2. Add user lookup from the `users` table
3. Validate password against stored hash
4. Handle account creation for new users
5. Remove the demo user logic

---

## Authentication Flow

### High-Level Flow

```
User Request
    ↓
/auth/signin (Sign-in page)
    ↓
Select authentication method:
  ├─ GitHub → OAuth flow → Callback → D1/SQLite
  ├─ Google → OAuth flow → Callback → D1/SQLite
  └─ Credentials → Direct validation → D1/SQLite
    ↓
/api/auth/[...nextauth]/ (Auth route handler - Node.js runtime)
    ↓
JWT token created and stored in httpOnly cookie
    ↓
Redirect to /dashboard or referrer
    ↓
middleware.ts validates JWT on protected routes
    ↓
Allow/deny access to protected resources
```

### Detailed Steps

1. **User Visits Sign-In Page** (`app/auth/signin/page.tsx`)
   - Displays OAuth buttons (GitHub, Google)
   - Displays credentials form (email/password)
   - Shows demo credentials hint

2. **User Submits Credentials or OAuth Request**
   - Credentials form validates locally (Zod schema)
   - OAuth redirects to provider

3. **Auth Route Handler Processes** (`app/api/auth/[...nextauth]/route.ts`)
   - Runs in Node.js runtime (required for D1 adapter)
   - Creates Auth.js instance with Drizzle adapter
   - For OAuth: validates provider response
   - For credentials: calls authorize() function
   - Creates user in database if new (OAuth only)
   - Creates session or JWT token

4. **Session Created**
   - JWT token stored in httpOnly cookie (secure, not accessible via JavaScript)
   - Session record stored in `sessions` table (for session strategy)
   - Redirect to dashboard or original page

5. **Middleware Validates Access** (`middleware.ts`)
   - Checks JWT token on protected routes
   - Allows or denies access based on token validity
   - Redirects to sign-in if token missing or invalid

6. **User Accesses Protected Route** (`app/dashboard/page.tsx`)
   - Session data available via `getSession()` or `useSession()`
   - User information displayed from session

---

## Database Schema

Auth data is persisted using Drizzle ORM. All tables are defined in `drizzle/schema/users.ts`.

### Users Table

Stores core user information. All auth-related tables cascade delete when user is deleted.

```typescript
Table: users
├── id (UUID) - Primary key, auto-generated
├── name (string, nullable) - User's display name
├── email (string, unique, nullable) - Email address
├── emailVerified (timestamp, nullable) - Email verification timestamp
├── image (string, nullable) - User's avatar URL
├── createdAt (timestamp) - Account creation date
└── updatedAt (timestamp) - Last update timestamp
```

### Accounts Table

Links users to OAuth provider accounts. Stores OAuth tokens and metadata.

```typescript
Table: accounts
├── userId (UUID) - Foreign key to users.id [ON DELETE CASCADE]
├── type (string) - OAuth type ("oauth", "oidc", etc.)
├── provider (string) - Provider name ("github", "google")
├── providerAccountId (string) - Provider's user ID
├── (provider, providerAccountId) - Composite primary key
├── refresh_token (string, nullable) - Refresh token
├── access_token (string, nullable) - Access token
├── expires_at (integer, nullable) - Token expiration timestamp
├── token_type (string, nullable) - Token type ("Bearer")
├── scope (string, nullable) - OAuth scope permissions
├── id_token (string, nullable) - OpenID token
└── session_state (string, nullable) - OAuth session state
```

### Sessions Table

Stores JWT session tokens with expiration. Used when `session.strategy = "jwt"`.

```typescript
Table: sessions
├── sessionToken (string) - Primary key, unique session identifier
├── userId (UUID) - Foreign key to users.id [ON DELETE CASCADE]
└── expires (timestamp) - Session expiration date
```

### Verification Tokens Table

Temporary tokens for email verification and password reset flows.

```typescript
Table: verificationTokens
├── identifier (string) - Email or identifier
├── token (string) - Verification token
├── (identifier, token) - Composite primary key
└── expires (timestamp) - Token expiration date
```

### Authenticators Table

Stores WebAuthn credentials for passkey/biometric authentication (future extension).

```typescript
Table: authenticators
├── credentialID (string) - WebAuthn credential ID
├── userId (UUID) - Foreign key to users.id [ON DELETE CASCADE]
├── (userId, credentialID) - Composite primary key
├── providerAccountId (string) - Provider's account ID
├── credentialPublicKey (blob) - Public key
├── counter (integer) - Counter for sign count
├── credentialDeviceType (string) - Device type
├── credentialBackedUp (boolean) - Backup status
├── transports (string, nullable) - Transport methods
└── created_at (timestamp, nullable) - Creation timestamp
```

### Counters Table

Example data for CRUD operations (not auth-related).

```typescript
Table: counters
├── id (integer) - Primary key
├── name (string) - Counter name
└── value (integer) - Counter value
```

### Usage Metrics Table

Tracks API usage and costs for LLM operations.

```typescript
Table: usageMetrics
├── id (UUID) - Primary key
├── userId (UUID, nullable) - User who made the request
├── provider (string) - LLM provider (openai, gemini)
├── model (string) - Model name
├── inputTokens (integer) - Input token count
├── outputTokens (integer) - Output token count
├── cost (numeric) - Calculated cost
├── createdAt (timestamp) - Request timestamp
└── metadata (text, nullable) - Additional data (JSON)
```

---

## Configuration

### Environment Variables

**Required:**
```env
AUTH_SECRET=<generated-secret>
# Generate with: openssl rand -base64 32
```

**For OAuth Providers:**
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Optional:**
```env
# Log level for auth debugging
LOG_LEVEL=debug  # "debug", "info", "warn", "error"

# Default LLM provider
DEFAULT_LLM_PROVIDER=openai

# Callback URL (auto-detected in development)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
```

### Auth.js Configuration

The complete Auth.js configuration is in `lib/auth/index.ts`:

```typescript
export function createAuth(env: CloudflareEnvWithSecrets) {
  return NextAuth({
    // Session uses JWT strategy for edge runtime compatibility
    session: {
      strategy: "jwt",
    },

    // Pages
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },

    // Providers (GitHub, Google, Credentials)
    providers: [...],

    // Drizzle adapter for database persistence
    adapter: DrizzleAdapter(database, adapterSchema),

    // Callbacks
    callbacks: {
      authorized(),  // Middleware protection
      jwt(),        // Add user ID to JWT
      session(),    // Add token ID to session
    },

    secret: env.AUTH_SECRET,
    trustHost: true,
  });
}
```

---

## Components & Pages

### Sign-In Page (`app/auth/signin/page.tsx`)

Entry point for authentication. Features:
- OAuth buttons with provider icons
- Email/password form with validation
- Demo credentials hint
- Error message display
- Loading state with spinner
- Link back to home page

**Usage:**
```bash
curl http://localhost:3000/auth/signin
```

### Error Page (`app/auth/error/page.tsx`)

Displays Auth.js errors from `?error=` query parameter.

**Supported Errors:**
- `Configuration` - Server configuration problem
- `AccessDenied` - User not authorized
- `OAuthSignin` - OAuth sign-in failed
- `OAuthCallback` - OAuth callback failed
- `OAuthCreateAccount` - OAuth account creation failed
- `CredentialsSignin` - Invalid credentials
- `SessionCallback` - Session creation failed

**Example:**
```bash
http://localhost:3000/auth/error?error=CredentialsSignin
```

### Protected Dashboard (`app/dashboard/page.tsx`)

Requires authentication. Features:
- Welcome message with user name
- Sign-out button
- Educational content about auth
- Links to example features

**Requires:**
- Valid JWT token in httpOnly cookie
- Session validation in middleware

### Sign-Out Button (`components/auth/sign-out-button.tsx`)

Client component for signing out users.

```typescript
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function Component() {
  return <SignOutButton />;
}
```

---

## Middleware & Route Protection

### Middleware (`middleware.ts`)

Edge-compatible middleware that validates JWT tokens on protected routes.

**Protected Routes:**
- `/dashboard` - Dashboard page
- `/api/protected/*` - Protected API endpoints

**Implementation:**
```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)",
  ],
};

export default NextAuth(authConfig).auth((req) => {
  // req.auth contains user session if logged in
  // Middleware callback validates access
});
```

**Behavior:**
- Unauthenticated users accessing `/dashboard` → redirect to `/auth/signin`
- Valid JWT token → allow access
- Expired token → redirect to signin
- API routes return 401 Unauthorized if no valid token

### Route Handler (`app/api/auth/[...nextauth]/route.ts`)

Processes all authentication requests. **Must use Node.js runtime** to support database adapters.

```typescript
export const runtime = "nodejs";  // Required for D1 adapter

async function handler(request: Request) {
  const env = await getEnv();
  const { handlers } = createAuth(env);

  if (request.method === "GET") {
    return handlers.GET(request);
  }
  if (request.method === "POST") {
    return handlers.POST(request);
  }

  return new Response("Not Found", { status: 404 });
}

export const GET = handler;
export const POST = handler;
```

---

## Development vs. Production

### Development Database

Uses **SQLite with better-sqlite3**:
- Database file: `./local.db`
- No network latency
- Instant testing and iteration
- Seeded with demo user

**Start development:**
```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

### Production Database

Uses **Cloudflare D1**:
- Serverless SQLite at the edge
- Global distribution
- Secure environment variables
- Automatic backups

**Deployment:**
```bash
wrangler d1 create cf-next-llm-db
# Copy database_id to wrangler.jsonc
wrangler secret put AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
# ... set other secrets
wrangler d1 migrations apply cf-next-llm-db --remote
pnpm deploy
```

### Database Selection Logic (`lib/cloudflare.ts`)

```typescript
export function getDatabase(): DbInstance {
  if (process.env.NODE_ENV === "development") {
    return getLocalDb();  // SQLite via better-sqlite3
  } else {
    return getDb(env);    // Cloudflare D1
  }
}
```

---

## Security Considerations

### ✅ Secure Practices Implemented

1. **HttpOnly Cookies** - JWT stored in secure, httpOnly cookies (JavaScript cannot access)
2. **CSRF Protection** - Built into Auth.js for all operations
3. **Secure Session Storage** - Sessions in database with expiration
4. **Password Validation** - Minimum 8 characters (extend in production)
5. **Foreign Key Constraints** - Cascading deletes prevent orphaned records
6. **OAuth Token Storage** - Tokens encrypted in production environment
7. **Middleware Validation** - All protected routes checked server-side
8. **Environment Secrets** - API keys and secrets in .env (not in code)

### ⚠️ Production Changes Required

1. **Credentials Provider**
   - Replace demo user logic with real database lookup
   - Implement password hashing (bcrypt or argon2)
   - Add user registration flow
   - Implement password reset via email

2. **OAuth Providers**
   - Enable in production environment
   - Set correct redirect URIs
   - Add HTTPS requirement
   - Test with real OAuth apps

3. **Session Management**
   - Configure appropriate JWT expiration
   - Implement refresh token rotation
   - Set secure cookie flags
   - Monitor for suspicious activity

4. **Logging & Monitoring**
   - Log authentication attempts
   - Monitor failed login attempts
   - Alert on unusual patterns
   - Use structured logging with timestamps

---

## Testing Authentication

### Test Sign-In with Demo Credentials

```bash
# Start the dev server
pnpm dev

# Visit sign-in page
open http://localhost:3000/auth/signin

# Use demo credentials
Email: demo@example.com
Password: password123

# Verify redirect to dashboard
# http://localhost:3000/dashboard
```

### Test Protected Routes

```bash
# Without authentication (should redirect to signin)
curl http://localhost:3000/dashboard
# Expected: 307 redirect to /auth/signin

# With JWT cookie (requires manual cookie setup in client)
curl -H "Cookie: authjs.session-token=..." http://localhost:3000/dashboard
# Expected: Dashboard page HTML
```

### Test Sign-Out

```bash
# Click "Sign Out" button on dashboard
# Expected: Redirect to home page
# Verify cookie deleted: Cookie cleared from browser
```

### Test Error Handling

```bash
# Visit error page with error code
open http://localhost:3000/auth/error?error=CredentialsSignin

# Expected: Error message displayed with debug info
```

---

## API Endpoints

### GET /api/auth/signin

Returns sign-in page HTML. POST to sign in.

### POST /api/auth/signin

Handles sign-in for credentials and OAuth callback.

**Credentials:**
```bash
curl -X POST http://localhost:3000/api/auth/signin/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```

### POST /api/auth/signout

Signs out user and clears session.

```bash
curl -X POST http://localhost:3000/api/auth/signout
```

### GET /api/auth/callback/[provider]

Handles OAuth callback from provider (GitHub, Google).

### GET /api/auth/session

Returns current user session (requires valid token).

```bash
curl http://localhost:3000/api/auth/session \
  -H "Cookie: authjs.session-token=..."
```

---

## Extending Authentication

### Add a New OAuth Provider

1. **Register Provider App**
   - Get client ID and secret
   - Set redirect URI to `http://localhost:3000/api/auth/callback/[provider]`

2. **Update `lib/auth/config.ts`**
   ```typescript
   import MyProvider from "@auth/core/providers/myprovider";

   providers: [
     // ... existing providers
     MyProvider({
       clientId: process.env.MY_PROVIDER_CLIENT_ID,
       clientSecret: process.env.MY_PROVIDER_CLIENT_SECRET,
     }),
   ]
   ```

3. **Set Environment Variables**
   ```env
   MY_PROVIDER_CLIENT_ID=...
   MY_PROVIDER_CLIENT_SECRET=...
   ```

4. **Update `.env.example`**
   ```env
   MY_PROVIDER_CLIENT_ID=
   MY_PROVIDER_CLIENT_SECRET=
   ```

### Add Email Verification

1. **Create email verification route** (`app/api/auth/verify-email/route.ts`)
2. **Update credentials provider** to check `emailVerified`
3. **Send verification email** after registration
4. **Handle verification token** in callback route

### Add Password Reset

1. **Create request password reset endpoint** (`/api/auth/forgot-password`)
2. **Send reset email** with token link
3. **Create reset password page** (`/auth/reset-password`)
4. **Validate token** and update password in database

### Add Two-Factor Authentication (2FA)

1. **Store 2FA secret** in `users` table (add column)
2. **Generate TOTP secret** on setup
3. **Verify code** after password entry
4. **Store backup codes** for account recovery

---

## Troubleshooting

### Issue: "Invalid email or password"

**Causes:**
- Typo in demo credentials (case-sensitive)
- Password too short (< 8 characters)
- Invalid email format

**Fix:** Use exact credentials: `demo@example.com` / `password123`

### Issue: Redirect loop on /auth/signin

**Causes:**
- Invalid or missing AUTH_SECRET
- JWT token corrupted
- Middleware configuration error

**Fix:**
```bash
# Generate new AUTH_SECRET
openssl rand -base64 32

# Update .env
AUTH_SECRET=<new-secret>

# Restart dev server
pnpm dev
```

### Issue: "Configuration" error on signin

**Causes:**
- Missing AUTH_SECRET
- Invalid OAuth credentials
- Database connection error

**Fix:**
1. Check `.env` has AUTH_SECRET, GITHUB_CLIENT_ID, etc.
2. Verify database is running (SQLite or D1)
3. Check server logs for detailed error

### Issue: OAuth callback fails

**Causes:**
- Wrong redirect URI in OAuth app settings
- OAuth credentials don't match environment
- Network/CORS issue

**Fix:**
1. Verify redirect URI matches OAuth app settings:
   - Dev: `http://localhost:3000/api/auth/callback/[provider]`
   - Prod: `https://<domain>/api/auth/callback/[provider]`
2. Check environment variables match OAuth app
3. Test with curl to verify endpoint exists

### Issue: "The edge runtime does not support Node.js" error

**Cause:** Auth route handler using edge runtime (requires Node.js)

**Fix:** Ensure `app/api/auth/[...nextauth]/route.ts` has:
```typescript
export const runtime = "nodejs";
```

### Issue: Session expires immediately

**Causes:**
- JWT token expiration too short
- Clock skew between servers
- Cookie settings incorrect

**Fix:**
1. Check Auth.js config in `lib/auth/index.ts`
2. Verify `session.maxAge` is appropriate (default 30 days)
3. Check browser cookie settings aren't blocking httpOnly

---

## File Reference

| Component | File Path |
|-----------|-----------|
| Auth Config (Base) | `lib/auth/config.ts` |
| Auth Config (Complete) | `lib/auth/index.ts` |
| Middleware | `middleware.ts` |
| Auth Route Handler | `app/api/auth/[...nextauth]/route.ts` |
| Sign-In Page | `app/auth/signin/page.tsx` |
| Error Page | `app/auth/error/page.tsx` |
| Dashboard Page | `app/dashboard/page.tsx` |
| Sign-Out Button | `components/auth/sign-out-button.tsx` |
| User Schema | `drizzle/schema/users.ts` |
| Database Client | `lib/db.ts` |
| Cloudflare Context | `lib/cloudflare.ts` |
| Environment Template | `.env.example` |

---

## Additional Resources

- [Auth.js Documentation](https://authjs.dev)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Drizzle ORM](https://orm.drizzle.team)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [Cloudflare D1](https://developers.cloudflare.com/d1)
