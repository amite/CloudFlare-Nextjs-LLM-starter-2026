# Google OAuth Integration and Logout Button Implementation

**Date**: 2025-12-25
**Status**: ✅ Resolved
**Severity**: High
**Component**: Authentication (Auth.js v5 with OAuth)

---

## Summary

Successfully enabled Google OAuth authentication in development environment and added a logout button to the dashboard. The implementation required fixing the Auth.js adapter configuration to work with local SQLite database during development while maintaining compatibility with Cloudflare D1 in production.

---

## Initial Problem

When attempting to sign in with Google OAuth, users encountered multiple authentication errors preventing successful OAuth flow completion:

1. **AdapterError: Cannot read properties of undefined (reading 'prepare')**
2. **NOT NULL constraint failed: users.created_at**
3. **AdapterError: no such table: account**

Additionally, the dashboard page had no logout functionality, requiring users to manually clear sessions.

---

## Root Causes

### 1. Edge Runtime in Development
The auth route handler (`app/api/auth/[...nextauth]/route.ts`) was configured to use **edge runtime** exclusively:
```typescript
export const runtime = "edge";
```

This caused issues because:
- Edge runtime cannot access Node.js modules like `better-sqlite3`
- Local development requires `better-sqlite3` for SQLite database access
- The D1 adapter expects a database connection but received `undefined` in development

### 2. Missing D1 Adapter Compatibility Layer
The `getEnv()` function in `lib/cloudflare.ts` returned `DB: undefined` in development mode, causing the D1Adapter to fail when trying to execute database operations.

### 3. Wrong Adapter for Development
Initially used `@auth/d1-adapter` which is specifically designed for Cloudflare D1 and doesn't work with local SQLite databases.

### 4. Incorrect Schema Format
When switched to `@auth/drizzle-adapter`, the schema was passed incorrectly. The adapter expects a specific object structure:
```typescript
{
  usersTable: users,
  accountsTable: accounts,
  // etc.
}
```

Instead of just passing the schema module directly.

---

## Step-by-Step Fix

### Step 1: Add Logout Button Component

**Created**: `components/auth/sign-out-button.tsx`

```typescript
"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
    >
      {isLoading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Signing out...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </>
      )}
    </button>
  );
}
```

**Features**:
- Client component using `signOut` from next-auth/react
- Loading state during sign-out process
- Redirects to home page after sign-out
- Destructive styling (red) to indicate action
- Logout icon for better UX

**Updated**: `app/dashboard/page.tsx`

Added the logout button to the dashboard header:
```typescript
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="...">← Back to Home</Link>
        <SignOutButton />
      </div>
      {/* rest of dashboard */}
    </main>
  );
}
```

### Step 2: Fix Auth Route Runtime Configuration

**Updated**: `app/api/auth/[...nextauth]/route.ts`

Changed from edge runtime to Node.js runtime to enable local SQLite access:

```typescript
// Before
export const runtime = "edge";

// After
export const runtime = "nodejs";
```

**Reason**: Node.js runtime is required to:
- Access `better-sqlite3` module for local SQLite database
- Support both development (local SQLite) and production (D1 via OpenNext)

**Note**: OpenNext handles runtime adaptation for Cloudflare Workers during build, so using `"nodejs"` in the route config is safe for production deployment.

### Step 3: Install Drizzle Adapter

**Installed**: `@auth/drizzle-adapter@1.11.1`

```bash
pnpm add @auth/drizzle-adapter
```

**Reason**:
- The Drizzle adapter works with both local SQLite and Cloudflare D1
- Uses Drizzle ORM under the hood, which we already use for database operations
- Properly handles all Auth.js adapter operations (user creation, account linking, sessions)

### Step 4: Update Auth Configuration

**Updated**: `lib/auth/index.ts`

Changed from D1Adapter to DrizzleAdapter with proper schema structure:

```typescript
// Before
import { D1Adapter } from "@auth/d1-adapter";
import NextAuth from "next-auth";
import { getDb, getLocalDb } from "@/lib/db";
import { authConfig } from "./config";

export function createAuth(env: CloudflareEnvWithSecrets) {
  return NextAuth({
    ...authConfig,
    adapter: D1Adapter(env.DB), // Fails in development - DB is undefined
    secret: env.AUTH_SECRET,
  });
}

// After
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import { getDb, getLocalDb } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  authenticators,
} from "@/drizzle/schema";
import { authConfig } from "./config";

export function createAuth(env: CloudflareEnvWithSecrets) {
  let database;

  // Use appropriate database based on environment
  if (process.env.NODE_ENV === "development") {
    database = getLocalDb(); // Uses better-sqlite3
  } else {
    database = getDb(env); // Uses Cloudflare D1
  }

  // Create schema object in the format expected by DrizzleAdapter
  const adapterSchema = {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  };

  return NextAuth({
    ...authConfig,
    adapter: DrizzleAdapter(database, adapterSchema),
    secret: env.AUTH_SECRET,
  });
}
```

**Key Changes**:
1. Switched from `D1Adapter` to `DrizzleAdapter`
2. Added environment-based database selection (local SQLite vs D1)
3. Created `adapterSchema` object with correct structure expected by DrizzleAdapter
4. Imported individual table definitions instead of whole schema module

### Step 5: Add Missing Environment Variable

**Updated**: `.env`

Added `NEXTAUTH_URL` for explicit base URL configuration:

```env
NEXTAUTH_URL=http://localhost:3000
```

**Reason**:
- Auth.js needs explicit base URL in Node.js runtime
- Prevents "Configuration" errors during OAuth callback
- Required for proper redirect URL generation

### Step 6: Create Error Page

**Created**: `app/auth/error/page.tsx`

Implemented error page to handle authentication failures gracefully:

```typescript
export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const error = params.error || "Unknown error";

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration...",
    AccessDenied: "You do not have permission to sign in.",
    Callback: "There was a problem with the OAuth callback.",
    // ... more error types
  };

  const message = errorMessages[error] || `An error occurred: ${error}`;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="mb-2 font-bold text-xl text-red-900">Authentication Error</h1>
        <p className="mb-6 text-red-800">{message}</p>
        {/* Links to retry or go home */}
      </div>
      {/* Debug information section */}
    </main>
  );
}
```

**Features**:
- User-friendly error messages for common Auth.js errors
- Debug information section showing error code
- Options to retry or return home
- Proper styling consistent with the app design

### Step 7: Simplify Cloudflare Environment Helper

**Updated**: `lib/cloudflare.ts`

Removed the D1 wrapper attempt and simplified the development environment:

```typescript
export async function getEnv(): Promise<CloudflareEnvWithSecrets> {
  // In development, fall back to process.env for environment variables
  if (process.env.NODE_ENV === "development") {
    return {
      // Cloudflare bindings (not available in development)
      // Auth will use Drizzle adapter with local SQLite instead
      DB: undefined as unknown as D1Database,
      ASSETS: undefined as unknown as Fetcher,
      // Environment variables from .env
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      // ... other env vars
      AUTH_SECRET: process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      // ...
    };
  }

  const { env } = await getCloudflareContext();
  return env as CloudflareEnvWithSecrets;
}
```

**Reason**:
- No longer need to create a D1 wrapper for better-sqlite3
- DrizzleAdapter handles database abstraction
- Cleaner and more maintainable code

---

## How the DrizzleAdapter Schema Works

The `@auth/drizzle-adapter` expects a specific schema structure. Based on the TypeScript definitions in `node_modules/@auth/drizzle-adapter/lib/sqlite.d.ts`:

```typescript
export type DefaultSQLiteSchema = {
  usersTable: DefaultSQLiteUsersTable;
  accountsTable: DefaultSQLiteAccountsTable;
  sessionsTable?: DefaultSQLiteSessionsTable;
  verificationTokensTable?: DefaultSQLiteVerificationTokenTable;
  authenticatorsTable?: DefaultSQLiteAuthenticatorTable;
};
```

**Common Mistakes**:
- ❌ Passing `import * as schema from "@/drizzle/schema"` directly
- ❌ Not providing table names with the `Table` suffix (e.g., `users` instead of `usersTable`)
- ✅ Creating an object with the exact key names the adapter expects

---

## Files Modified

| File | Change Type | Description |
|------|------------|-------------|
| `components/auth/sign-out-button.tsx` | **Created** | Client component for logout functionality |
| `app/dashboard/page.tsx` | **Modified** | Added logout button to dashboard header |
| `app/api/auth/[...nextauth]/route.ts` | **Modified** | Changed runtime from edge to nodejs |
| `app/auth/error/page.tsx` | **Created** | Error page for authentication failures |
| `lib/auth/index.ts` | **Modified** | Switched to DrizzleAdapter with proper schema |
| `lib/cloudflare.ts` | **Modified** | Simplified env helper, removed D1 wrapper |
| `.env` | **Modified** | Added `NEXTAUTH_URL` environment variable |
| `package.json` | **Modified** | Added `@auth/drizzle-adapter@1.11.1` |

---

## Google Cloud Console Setup

To enable Google OAuth, configure credentials in Google Cloud Console:

1. **Navigate to**: https://console.cloud.google.com/
2. **Create or select project**
3. **Enable APIs**: APIs & Services → Library → Google+ API (Enable)
4. **Configure OAuth Consent Screen**:
   - User type: External
   - App name: Your app name
   - User support email: Your email
   - Scopes: openid, email, profile
   - Add test users (for development)

5. **Create OAuth 2.0 Credentials**:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: "CF Next LLM App - Local Dev"

   **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`

   **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - (For production: `https://your-domain.workers.dev/api/auth/callback/google`)

6. **Copy credentials** and add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

---

## Testing Verification

### Test 1: Email/Password Login (Existing)
```bash
# Visit sign-in page
http://localhost:3000/auth/signin

# Credentials
Email: demo@example.com
Password: password123

# Result: ✅ Works as before
```

### Test 2: Google OAuth Login (New)
```bash
# Visit sign-in page
http://localhost:3000/auth/signin

# Click "Continue with Google"
# Select Google account
# Grant permissions

# Result: ✅ Redirects to /dashboard with active session
```

### Test 3: Logout Functionality (New)
```bash
# From dashboard, click "Sign Out" button
# Result: ✅ Redirects to home page, session cleared
# Verify: Accessing /dashboard redirects to sign-in page
```

### Test 4: OAuth User Persistence
```bash
# Sign in with Google
# Sign out
# Sign in with Google again
# Result: ✅ Same user record recognized, no duplicate created
```

### Test 5: Database Verification
```bash
sqlite3 local.db "SELECT email, name FROM users;"
# Result: ✅ Google OAuth user created in database

sqlite3 local.db "SELECT provider, type FROM accounts;"
# Result: ✅ OAuth account record exists with provider="google"
```

---

## Architecture Flow

### Development Environment

```
User clicks "Sign in with Google"
    ↓
Next.js Auth Route (Node.js runtime)
    ↓
DrizzleAdapter receives request
    ↓
getLocalDb() → better-sqlite3 → local.db
    ↓
User/Account records created in local SQLite
    ↓
JWT session token generated
    ↓
Redirect to /dashboard with session cookie
```

### Production Environment (Cloudflare Workers)

```
User clicks "Sign in with Google"
    ↓
OpenNext-adapted Worker (transformed Node.js code)
    ↓
DrizzleAdapter receives request
    ↓
getDb(env) → Drizzle ORM → Cloudflare D1
    ↓
User/Account records created in D1 database
    ↓
JWT session token generated
    ↓
Redirect to /dashboard with session cookie
```

---

## Key Learnings

### 1. Runtime Compatibility
- **Edge runtime**: Great for middleware and simple routes, but cannot use Node.js modules
- **Node.js runtime**: Required for `better-sqlite3` and other Node modules
- **OpenNext**: Handles adaptation for Cloudflare Workers, so Node.js routes still work in production

### 2. Adapter Selection
- `@auth/d1-adapter`: Only works with Cloudflare D1, not suitable for local development
- `@auth/drizzle-adapter`: Works with any Drizzle ORM instance (SQLite, D1, PostgreSQL, MySQL)
- Schema structure matters: Must provide object with keys like `usersTable`, `accountsTable`

### 3. Environment Variables
- `AUTH_SECRET`: Required for JWT signing (both dev and prod)
- `NEXTAUTH_URL`: Needed in Node.js runtime for proper URL generation
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth credentials from Google Console

### 4. Database Schema
- Auth.js requires specific table structure (users, accounts, sessions, verificationTokens, authenticators)
- Our schema in `drizzle/schema/users.ts` already had the correct structure
- Only needed to export it in the format the adapter expects

---

## Production Deployment Notes

When deploying to Cloudflare Workers:

### 1. Update Google OAuth Settings
Add production domain to authorized origins and redirect URIs:
```
https://your-app.workers.dev
https://your-app.workers.dev/api/auth/callback/google
```

### 2. Set Cloudflare Secrets
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put AUTH_SECRET
```

### 3. Update Environment Variables
Set production values in Wrangler:
```bash
wrangler secret put NEXTAUTH_URL
# Enter: https://your-app.workers.dev
```

### 4. Database Migration
Apply migrations to production D1:
```bash
wrangler d1 migrations apply cf-next-llm-db --remote
```

### 5. Build and Deploy
```bash
pnpm build
pnpm deploy
```

---

## Performance Considerations

### Development
- Local SQLite: Fast, no network latency
- better-sqlite3: Synchronous operations, excellent performance
- No external dependencies for database access

### Production
- Cloudflare D1: Edge-optimized SQLite
- Global distribution: Database reads from nearest data center
- Drizzle ORM: Minimal overhead, type-safe queries

---

## Security Considerations

### OAuth Security
- ✅ CSRF protection via Auth.js built-in mechanisms
- ✅ State parameter validation in OAuth flow
- ✅ Secure callback URL verification
- ✅ JWT tokens signed with AUTH_SECRET
- ✅ HTTP-only cookies for session tokens

### Database Security
- ✅ Foreign key constraints on accounts table
- ✅ Cascade delete on user removal
- ✅ Email uniqueness enforced
- ✅ No password storage for OAuth users

### Environment Variables
- ✅ Never commit `.env` to git (in `.gitignore`)
- ✅ Use Cloudflare Secrets for production
- ✅ Rotate secrets if accidentally exposed

---

## Future Enhancements

### Potential Improvements
1. **GitHub OAuth**: Already configured in auth config, just needs credentials
2. **OAuth Profile Sync**: Update user name/image from OAuth provider on each login
3. **Account Linking**: Allow users to link multiple OAuth providers to one account
4. **Session Management**: Add UI to view and revoke active sessions
5. **2FA Support**: Implement two-factor authentication for credentials provider
6. **Email Verification**: Send verification emails for new accounts

### Production Optimizations
1. **Cache Sessions**: Use Cloudflare KV for session caching
2. **Rate Limiting**: Add rate limits on auth endpoints
3. **Analytics**: Track OAuth provider usage
4. **Error Monitoring**: Integrate Sentry or similar for auth error tracking

---

## Troubleshooting

### Issue: "Configuration" Error
**Cause**: Missing `NEXTAUTH_URL` or incorrect base URL
**Fix**: Ensure `NEXTAUTH_URL` is set in `.env`

### Issue: "no such table: account"
**Cause**: DrizzleAdapter schema not in correct format
**Fix**: Use object with `usersTable`, `accountsTable` keys (not flat schema export)

### Issue: "Cannot read properties of undefined"
**Cause**: Edge runtime trying to use Node.js modules
**Fix**: Set `export const runtime = "nodejs"` in auth route

### Issue: OAuth Callback Fails
**Cause**: Redirect URI mismatch with Google Console
**Fix**: Verify redirect URI exactly matches: `http://localhost:3000/api/auth/callback/google`

### Issue: User Already Exists
**Cause**: Email already used by credentials provider
**Fix**: Use different email or link accounts (future enhancement)

---

## Related Documentation

- [Auth.js v5 Documentation](https://authjs.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [@auth/drizzle-adapter](https://authjs.dev/reference/adapter/drizzle)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)

---

## Success Metrics

✅ **Google OAuth working** in development environment
✅ **Logout button** functional on dashboard
✅ **User persistence** working (no duplicate accounts)
✅ **Error handling** graceful with error page
✅ **Database integration** seamless (local SQLite + future D1)
✅ **Production-ready** architecture (Node.js runtime compatible with OpenNext)

---

**Issue Resolved**: 2025-12-25
**Resolution Time**: ~2 hours (iterative debugging and fixes)
**Final Status**: ✅ **Working in Development** | 🚀 **Ready for Production Deployment**
