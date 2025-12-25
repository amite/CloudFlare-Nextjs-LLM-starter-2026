# Issue: Counter API Edge Runtime Error in Local Development

## Description
When accessing the counter example at `/examples/counter`, the API endpoint `/api/counter` returns a 500 error with the message:
```
The edge runtime does not support Node.js 'fs' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
```

## Context
- **Component:** Counter example page and API route
- **Error Location:** `app/api/counter/route.ts`
- **Environment:** Local development with `pnpm dev`
- **Runtime:** Edge runtime (incorrectly configured for local development)

## Root Cause
The counter API route was configured to use the edge runtime (`export const runtime = "edge"`), but the database layer was attempting to use `better-sqlite3` for local development. The edge runtime in Next.js does not support Node.js built-in modules like `fs`, which `better-sqlite3` requires to access the local SQLite database file.

The issue arose from a mismatch between:
1. **Runtime configuration:** Edge runtime (designed for Cloudflare Workers)
2. **Database implementation:** `better-sqlite3` (requires Node.js runtime)
3. **Development environment:** Local development using `next dev`

## Resolution
The fix involved three main changes:

### 1. Initialize Cloudflare Context for Development
Added `initOpenNextCloudflareForDev()` to `next.config.ts` to enable Cloudflare context access during local development:

```typescript
// next.config.ts
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // ... existing config
};
```

### 2. Add Local SQLite Support
Modified `lib/db.ts` to support both local SQLite (for development) and D1 (for production):

```typescript
// Added getLocalDb() function
export function getLocalDb() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";
  const sqlite = new Database(dbPath);
  return drizzleBetterSqlite(sqlite, { schema });
}
```

### 3. Update Database Selection Logic
Modified `lib/cloudflare.ts` to automatically select the appropriate database based on environment:

```typescript
export async function getDatabase() {
  const { getDb, getLocalDb } = await import("./db");
  
  // Use local SQLite in development, D1 in production
  if (process.env.NODE_ENV === "development") {
    return getLocalDb();
  }
  
  const env = await getEnv();
  return getDb(env);
}
```

### 4. Change API Route Runtime
Changed the counter API route from edge runtime to nodejs runtime:

```typescript
// app/api/counter/route.ts
// Before: export const runtime = "edge";
// After:
export const runtime = "nodejs";
```

## How It Works Now

The solution creates a dual-mode database system:

### Local Development (`NODE_ENV=development`)
- **Runtime:** Node.js runtime
- **Database:** Local SQLite file (`local.db`)
- **Driver:** `better-sqlite3`
- **No Cloudflare credentials required**

### Production Deployment (Cloudflare Workers)
- **Runtime:** Edge runtime
- **Database:** Cloudflare D1
- **Driver:** `drizzle-orm/d1`
- **Cloudflare credentials required**

## Important Notes

1. **Server Restart Required:** After changing the runtime configuration, you must restart the development server (`Ctrl+C` then `pnpm dev`) for changes to take effect.

2. **Runtime is Build-Time:** The `export const runtime` declaration is evaluated at build time, not runtime. You cannot conditionally set it based on environment variables in the same file.

3. **Database Abstraction:** The `getDatabase()` function in `lib/cloudflare.ts` handles the runtime-specific database selection, allowing the same API route code to work in both environments.

4. **Debug Script:** A debug script (`scripts/debug-db.ts`) was created to verify database connectivity and test operations.

## Verification Steps

After applying the fix:

1. Restart the development server:
   ```bash
   pnpm dev
   ```

2. Visit the counter page:
   ```
   http://localhost:3000/examples/counter
   ```

3. Test the counter:
   - Click the + button to increment
   - Click the - button to decrement
   - Refresh the page to verify persistence

4. Verify database operations:
   ```bash
   sqlite3 local.db "SELECT * FROM counters;"
   ```

## Related Files Modified

- `next.config.ts` - Added Cloudflare initialization
- `lib/db.ts` - Added local SQLite support
- `lib/cloudflare.ts` - Updated database selection logic
- `app/api/counter/route.ts` - Changed runtime to nodejs
- `scripts/debug-db.ts` - Created debug script (new file)

## Prevention

When creating new API routes that need database access:

1. **For local development:** Use `export const runtime = "nodejs"` if you need to use `better-sqlite3`
2. **For production:** The same code will work with D1 when deployed via OpenNext
3. **Always use `getDatabase()`** from `lib/cloudflare.ts` instead of directly importing database drivers
4. **Test locally first** before deploying to ensure database operations work correctly

## Alternative Approaches

If you prefer to use edge runtime in local development, you would need to:

1. Use `wrangler dev` instead of `next dev` (requires Cloudflare setup)
2. Or use a SQLite library that works in edge runtime (e.g., `@libsql/client` with remote database)

However, the current solution is recommended as it allows full local development without any Cloudflare infrastructure.

## References

- Next.js Edge Runtime: https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
- @opennextjs/cloudflare Documentation: https://opennextjs.org/cloudflare
- Drizzle ORM: https://orm.drizzle.team/

Documented on: December 25, 2024
