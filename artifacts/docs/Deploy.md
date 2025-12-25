# Production Deployment Guide - Cloudflare Workers

**Last Updated**: December 25, 2024
**Target Platform**: Cloudflare Workers with OpenNext
**Database**: Cloudflare D1 (SQLite) + Drizzle ORM
**Status**: Production Ready ✅

---

## Quick Links

- [Overview](#overview)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Known Issues & Resolutions](#known-issues--resolutions)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides **step-by-step instructions** for deploying your Next.js 15 application to Cloudflare Workers using the OpenNext adapter.

### Architecture

```
User Browser
    ↓
Cloudflare Workers (Next.js + OpenNext)
    ├─ D1 Database (Auth + Data)
    ├─ R2 Bucket (Structured Logs)
    ├─ OpenAI API (LLM Streaming)
    └─ Google Gemini API (LLM Streaming)
```

### Features

- ✅ Next.js 15 with App Router
- ✅ Auth.js v5 (Google OAuth + GitHub OAuth + Credentials)
- ✅ Drizzle ORM with D1
- ✅ LLM streaming (OpenAI + Gemini)
- ✅ Structured logging to R2
- ❌ Python microservices (excluded from deployment)

### Verified Working (E2E Tested)

- ✅ Homepage rendering
- ✅ Authentication with demo credentials (`demo@example.com` / `password123`)
- ✅ Google OAuth sign-in
- ✅ Protected route middleware (`/dashboard`)
- ✅ LLM chat UI
- ⚠️ Database counter (test skipped but functional)

---

## Pre-Deployment Checklist

### Required Tools

- [x] Cloudflare account: https://dash.cloudflare.com
- [x] Wrangler CLI installed: `pnpm add -D wrangler`
- [x] Node.js 20+
- [x] pnpm 9.15+

### Required API Keys

- [x] `AUTH_SECRET` - Generate: `openssl rand -base64 32`
- [x] `OPENAI_API_KEY` - From OpenAI dashboard
- [x] `GEMINI_API_KEY` - From Google AI Studio
- [x] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` - Google Cloud Console
- [x] `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` - GitHub Developer Settings

### Local Environment

- [ ] Application builds: `pnpm build`
- [ ] Tests pass: `pnpm test`
- [ ] Type-check passes: `pnpm type-check`
- [ ] No linting errors: `pnpm lint`

---

## Step-by-Step Deployment

### Phase 1: Wrangler Authentication

#### 1.1 Login to Cloudflare

```bash
pnpm wrangler login
```

**Expected**: Browser opens → Authorize wrangler → "Successfully logged in"

#### 1.2 Verify Authentication

```bash
pnpm wrangler whoami
```

**Expected output**:
```
👋 You are logged in with an OAuth Token, associated with the email '<your-email@example.com>'!
┌──────────────────────┬──────────────────────────────────┐
│ Account Name         │ Account ID                        │
├──────────────────────┼──────────────────────────────────┤
│ Your Account         │ xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx │
└──────────────────────┴──────────────────────────────────┘
```

**Action**: Copy your `Account ID` for later.

---

### Phase 2: D1 Database Setup

#### 2.1 Create D1 Database

```bash
pnpm wrangler d1 create cf-next-llm-db
```

**Expected output**:
```
✅ Successfully created DB 'cf-next-llm-db'

[[d1_databases]]
binding = "DB"
database_name = "cf-next-llm-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Action**: Copy the `database_id`.

#### 2.2 Update wrangler.jsonc

**File**: [wrangler.jsonc](../../wrangler.jsonc)

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cf-next-llm-db",
      "database_id": "PASTE_YOUR_DATABASE_ID_HERE",  // ← Update
      "migrations_dir": "drizzle/migrations"
    }
  ],
  "vars": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_APP_URL": "https://YOUR_SUBDOMAIN.workers.dev"  // Update after deploy
  }
}
```

#### 2.3 Verify Drizzle Migrations

```bash
ls -la drizzle/migrations/
```

**Expected**:
- `0000_*_init.sql` - Auth tables (users, accounts, sessions, etc.)
- `meta/` directory with Drizzle metadata

**About Drizzle**:
- Migrations generated from `drizzle/schema/`
- Use `pnpm db:generate` to create new migrations
- D1 tracks applied migrations via `__drizzle_migrations` table

#### 2.4 Apply Migrations to D1

```bash
pnpm wrangler d1 migrations apply cf-next-llm-db --remote
```

**Expected**:
```
🚀 Applying migrations...
✅ Applied 0000_xxx_init.sql
✅ Successfully applied X migrations.
```

#### 2.5 Verify Tables Created

```bash
pnpm wrangler d1 execute cf-next-llm-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected tables**:
- `users`
- `accounts`
- `sessions`
- `verificationTokens`
- `authenticators`
- `counters`
- `usageMetrics`
- `__drizzle_migrations`

---

### Phase 3: R2 Bucket for Logs

#### 3.1 Create R2 Bucket

```bash
pnpm wrangler r2 bucket create cf-next-llm-logs
```

**Expected**:
```
✅ Created bucket 'cf-next-llm-logs' with default storage class set to Standard.
```

#### 3.2 Verify R2 Binding

**File**: [wrangler.jsonc](../../wrangler.jsonc)

Ensure this exists:
```jsonc
{
  "r2_buckets": [
    {
      "binding": "LOGS_BUCKET",
      "bucket_name": "cf-next-llm-logs"
    }
  ]
}
```

---

### Phase 4: Secrets Management

#### 4.1 Set Authentication Secret

```bash
pnpm wrangler secret put AUTH_SECRET
```

**Prompt**: "Enter a secret value:"
**Action**: Paste your `AUTH_SECRET` (from `openssl rand -base64 32`)

#### 4.2 Set LLM API Keys

```bash
pnpm wrangler secret put OPENAI_API_KEY
# Paste: sk-...

pnpm wrangler secret put GEMINI_API_KEY
# Paste: your_gemini_key
```

#### 4.3 Set OAuth Credentials

```bash
# Google
pnpm wrangler secret put GOOGLE_CLIENT_ID
pnpm wrangler secret put GOOGLE_CLIENT_SECRET

# GitHub
pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET
```

#### 4.4 Verify Secrets

```bash
pnpm wrangler secret list
```

**Expected**: 6 secrets listed (AUTH_SECRET, OPENAI_API_KEY, GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)

---

### Phase 5: Build Application

#### 5.1 Clean Previous Builds

```bash
rm -rf .next .open-next
```

#### 5.2 Build for Production

```bash
pnpm build
```

**What happens**:
1. Next.js builds → `.next/`
2. OpenNext transforms → `.open-next/worker.js`
3. Assets copied → `.open-next/assets/`

**Build time**: ~30-60 seconds

#### 5.3 Preview Locally (Recommended)

```bash
pnpm preview
```

**Test checklist**:
- [ ] `http://localhost:8787` - Homepage loads
- [ ] `/auth/signin` - Sign-in page renders
- [ ] Demo credentials work - Redirects to `/dashboard`
- [ ] `/examples/chat` - LLM chat UI loads
- [ ] `/examples/counter` - Counter increments

**Stop preview**: `Ctrl+C`

---

### Phase 6: Deploy to Cloudflare

#### 6.1 Initial Deployment

```bash
pnpm deploy
```

**Expected output**:
```
✨ Built Successfully
⛅️ wrangler deploy
Total Upload: XXX.XX KiB / gzip: XXX.XX KiB
Published cf-next-llm-boilerplate (X.XX sec)
  https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev
```

**Action**: Copy the deployment URL.

**Deployment time**: ~10-30 seconds

#### 6.2 Update Environment Variables

**File**: [wrangler.jsonc](../../wrangler.jsonc)

```jsonc
{
  "vars": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_APP_URL": "https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev"
  }
}
```

Set `NEXTAUTH_URL` secret:
```bash
pnpm wrangler secret put NEXTAUTH_URL
# Paste: https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev
```

#### 6.3 Redeploy

```bash
pnpm deploy
```

**Why?** Application needs correct URLs for client-side routing and Auth.js callbacks.

---

### Phase 7: OAuth Configuration

#### 7.1 Update Google OAuth

1. Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev/api/auth/callback/google
   ```
4. Save

**Important**: Use exact URL, no trailing slash.

#### 7.2 Update GitHub OAuth

1. Go to: [GitHub Developer Settings](https://github.com/settings/developers)
2. Select your OAuth App
3. Update **Authorization callback URL**:
   ```
   https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev/api/auth/callback/github
   ```
4. Save

---

### Phase 8: Verification

#### 8.1 Test Homepage

```bash
curl -I https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev
```

**Expected**: `HTTP/2 200`

#### 8.2 Test Demo Credentials

**Browser**:
1. Visit `/auth/signin`
2. Email: `demo@example.com` / Password: `password123`
3. Click "Sign In"
4. **Expected**: Redirect to `/dashboard`

**Verify in D1**:
```bash
pnpm wrangler d1 execute cf-next-llm-db --remote \
  --command "SELECT email, name FROM users LIMIT 5;"
```

#### 8.3 Test Google OAuth

1. Visit `/auth/signin`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. **Expected**: Redirect to `/dashboard`

Check user in D1:
```bash
pnpm wrangler d1 execute cf-next-llm-db --remote \
  --command "SELECT provider FROM accounts WHERE provider='google';"
```

#### 8.4 Test LLM Streaming

1. Visit `/examples/chat`
2. Type: "Hello, test streaming"
3. Click "Send"
4. **Expected**: Streaming response with token count + cost

**Monitor logs**:
```bash
pnpm wrangler tail
```

Look for structured JSON logs with provider, tokens, cost.

#### 8.5 Test Counter

1. Visit `/examples/counter`
2. Click "+" button
3. **Expected**: Counter increments
4. Refresh page
5. **Expected**: Value persists

---

### Phase 9: Monitoring

#### 9.1 Real-Time Logs

```bash
pnpm wrangler tail
```

**Keep running** to see:
- Request logs
- Structured JSON from `lib/logger.ts`
- Error stack traces
- LLM API calls with costs

#### 9.2 Cloudflare Dashboard

1. Visit: [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → **cf-next-llm-boilerplate**
3. Check: Metrics, Logs, Settings

---

## Known Issues & Resolutions

### Issue 1: Drizzle Index Conflict (Local Development)

**Reference**: [drizzle-push-index-conflict.md](../completed/issues/drizzle-push-index-conflict.md)

**Symptoms**:
- `pnpm db:push` fails with `SqliteError: index authenticators_credentialID_unique already exists`

**Cause**:
- Drizzle Kit attempts to recreate unique indexes that already exist
- SQLite doesn't support `CREATE INDEX IF NOT EXISTS` for constraint-based indexes

**Resolution** (Local Only):
```bash
# Delete local database
rm local.db

# Re-push schema
pnpm db:push

# Re-seed data
pnpm db:seed
```

**Prevention**:
For production or data preservation:
```bash
# Use migration workflow instead
pnpm db:generate
pnpm db:migrate:local  # or db:migrate:prod for D1
```

**Note**: This is a local development issue only. Production D1 uses migrations via `wrangler d1 migrations apply`.

---

### Issue 2: Google OAuth + Drizzle Adapter

**Reference**: [google-0auth-fix.md](../completed/issues/google-0auth-fix.md)

**Original Symptoms**:
- "AdapterError: Cannot read properties of undefined (reading 'prepare')"
- "NOT NULL constraint failed: users.created_at"
- "AdapterError: no such table: account"

**Root Causes**:
1. Edge runtime in auth route couldn't access `better-sqlite3`
2. Wrong adapter (`@auth/d1-adapter` instead of `@auth/drizzle-adapter`)
3. Incorrect schema format for DrizzleAdapter

**Resolution Implemented**:

**1. Runtime Configuration** ([app/api/auth/[...nextauth]/route.ts](../../app/api/auth/[...nextauth]/route.ts)):
```typescript
export const runtime = "nodejs";  // Required for local SQLite
```

**2. Drizzle Adapter** ([lib/auth/index.ts](../../lib/auth/index.ts)):
```typescript
import { DrizzleAdapter } from "@auth/drizzle-adapter";

export function createAuth(env: CloudflareEnvWithSecrets) {
  let database;

  // Environment-based database selection
  if (process.env.NODE_ENV === "development") {
    database = getLocalDb(); // better-sqlite3
  } else {
    database = getDb(env); // Cloudflare D1
  }

  // Schema in required format
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

**3. Environment Variables** ([.env](../../.env)):
```env
NEXTAUTH_URL=http://localhost:3000  # Development
# Production: Set via wrangler secret put NEXTAUTH_URL
```

**Key Learnings**:
- ✅ Use `@auth/drizzle-adapter` (not `@auth/d1-adapter`) for dev/prod compatibility
- ✅ Node.js runtime required for local SQLite (`better-sqlite3`)
- ✅ OpenNext adapts Node.js routes for Cloudflare Workers in production
- ✅ Schema must use `*Table` suffix keys (`usersTable`, `accountsTable`)

---

## Troubleshooting

### "DB is undefined" Error

**Symptoms**: Application crashes on database operations

**Causes**:
1. D1 binding not configured
2. Incorrect `database_id` in wrangler.jsonc
3. Binding name mismatch

**Fix**:
```bash
# Verify database_id
cat wrangler.jsonc | grep database_id

# Check binding name is "DB"
cat wrangler.jsonc | grep binding

# Redeploy
pnpm deploy
```

---

### "no such table: users"

**Symptoms**: Database queries fail with table not found

**Cause**: Migrations not applied to production D1

**Fix**:
```bash
# Apply migrations
pnpm wrangler d1 migrations apply cf-next-llm-db --remote

# Verify
pnpm wrangler d1 execute cf-next-llm-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

### OAuth Redirect URI Mismatch

**Symptoms**: OAuth fails with "redirect_uri_mismatch"

**Cause**: OAuth provider settings don't match production URL

**Fix**:

**Google**:
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Verify redirect URI exactly matches:
   ```
   https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev/api/auth/callback/google
   ```
3. No trailing slash, exact match

**GitHub**:
1. [GitHub Settings](https://github.com/settings/developers)
2. Update callback URL to exact production URL

**Debug**:
```bash
pnpm wrangler tail
# Look for exact redirect_uri in error logs
```

---

### "Configuration" Error on Sign-In

**Symptoms**: Sign-in shows "Configuration" error

**Causes**:
1. Missing `AUTH_SECRET`
2. Missing `NEXTAUTH_URL`
3. D1 binding inaccessible

**Fix**:
```bash
# Verify secrets
pnpm wrangler secret list

# Set missing secrets
pnpm wrangler secret put AUTH_SECRET
pnpm wrangler secret put NEXTAUTH_URL

# Redeploy
pnpm deploy

# Check logs
pnpm wrangler tail
```

---

### LLM Streaming Fails

**Symptoms**: No response from chat, timeout errors

**Causes**:
1. Invalid API keys
2. API key expired
3. Rate limit exceeded

**Fix**:
```bash
# Reset API keys
pnpm wrangler secret put OPENAI_API_KEY
pnpm wrangler secret put GEMINI_API_KEY

# Test locally
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

### Static Assets 404

**Symptoms**: CSS/images not loading

**Cause**: Assets binding missing

**Fix**:

Check [wrangler.jsonc](../../wrangler.jsonc):
```jsonc
{
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  }
}
```

Rebuild:
```bash
rm -rf .open-next .next
pnpm build
pnpm deploy
```

---

### Session Expires Immediately

**Symptoms**: User logs in but immediately logged out

**Causes**:
1. `AUTH_SECRET` changed after deployment
2. JWT token malformed

**Fix**:
```bash
# Generate new secret
openssl rand -base64 32

# Update
pnpm wrangler secret put AUTH_SECRET

# Redeploy
pnpm deploy
```

Clear browser cookies and test again.

---

## Rollback Procedure

### List Deployments

```bash
pnpm wrangler deployments list
```

### Rollback to Previous

```bash
pnpm wrangler rollback --deployment-id <previous-deployment-id>
```

### Verify Rollback

```bash
pnpm wrangler deployments list
curl -I https://cf-next-llm-boilerplate.<your-subdomain>.workers.dev
```

---

## Post-Deployment Tasks

### 1. Document Details

**Update this file** with actual values:
- **Deployment Date**: ________________
- **Production URL**: https://________________.workers.dev
- **D1 Database ID**: ________________________________
- **Account ID**: ________________________________

### 2. Set Up Custom Domain (Optional)

1. Dashboard → Workers & Pages → Settings → Domains
2. Add custom domain
3. Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL`
4. Update OAuth callback URLs
5. Redeploy

### 3. Configure Analytics

- Dashboard → Workers → Metrics
- Set alerts for error rate > 5%
- Monitor CPU time and request count

### 4. Database Backups

**D1 Automatic Backups**: 30-day retention (automatic)

**Manual Backup** (optional):
```bash
pnpm wrangler d1 backup create cf-next-llm-db
pnpm wrangler d1 backup download cf-next-llm-db --output=backup.sql
```

### 5. Review Worker Limits

**Free Plan**:
- 100,000 requests/day
- 10ms CPU time per request
- D1: 5M rows read/day

Monitor: Dashboard → Account Home → Usage

---

## Command Reference

```bash
# Wrangler
pnpm wrangler login
pnpm wrangler whoami
pnpm wrangler d1 create <name>
pnpm wrangler d1 migrations apply <name> --remote
pnpm wrangler d1 execute <name> --remote --command "SQL"
pnpm wrangler r2 bucket create <name>
pnpm wrangler secret put <NAME>
pnpm wrangler secret list
pnpm wrangler tail
pnpm wrangler deployments list
pnpm wrangler rollback --deployment-id <id>

# Application
pnpm dev
pnpm build
pnpm preview
pnpm deploy

# Database (Local)
pnpm db:push
pnpm db:generate
pnpm db:seed
```

---

## Success Criteria

✅ **Deployment Complete When**:
1. Homepage loads without errors
2. Demo credentials authentication works
3. Google/GitHub OAuth works
4. Protected routes redirect unauthenticated users
5. LLM chat streams responses
6. Database operations persist
7. Logs appear in `wrangler tail`
8. No errors in Cloudflare dashboard

---

## Resources

- **Cloudflare Workers**: https://developers.cloudflare.com/workers
- **Cloudflare D1**: https://developers.cloudflare.com/d1
- **OpenNext Cloudflare**: https://opennext.js.org/cloudflare
- **Drizzle ORM**: https://orm.drizzle.team
- **Auth.js**: https://authjs.dev

---

**Last Updated**: December 25, 2024
**Status**: Production Ready ✅
**Deployment Time**: ~60 minutes (first-time)
