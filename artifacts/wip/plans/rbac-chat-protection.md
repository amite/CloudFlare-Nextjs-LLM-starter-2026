# Implementation Plan: Role-Based Access Control for Chat Feature

**Goal**: Protect the LLM chat feature (`/examples/chat` and `/api/chat/stream`) so only manually approved users can access it, preventing unauthorized LLM API costs.

**Status**: Ready for Implementation
**Created**: 2025-12-25

---

## Summary

Add role-based access control with manual approval workflow:
- **Admin role**: You (initial admin) can approve new users
- **User role**: Approved users can access chat
- **Pending role**: New signups wait for approval
- **Admin dashboard**: UI to approve/reject pending users
- **Pending page**: Friendly message for unapproved users
- **Counter stays public**: Only chat is protected

---

## Architecture Overview

### Database Changes
```
users table (add 4 new fields):
├── role: "admin" | "user" | "pending"  (default: "pending")
├── isApproved: boolean                  (default: false)
├── approvedAt: timestamp                (nullable)
└── approvedBy: user_id FK               (nullable)
```

### JWT Session Enhancement
```
JWT token will include:
├── id: string
├── role: UserRole          ← NEW
└── isApproved: boolean     ← NEW
```

### Route Protection Matrix
```
Route                    | Auth Required | Approval Required | Admin Only
-------------------------|---------------|-------------------|------------
/examples/chat           | ✅            | ✅                | ❌
/api/chat/stream         | ✅            | ✅                | ❌
/examples/counter        | ❌            | ❌                | ❌
/dashboard               | ✅            | ❌                | ❌
/admin                   | ✅            | ✅                | ✅
/api/admin/*             | ✅            | ✅                | ✅
```

---

## Implementation Steps

### Phase 1: Database Schema (Foundation)

#### 1.1 Update User Schema
**File**: `drizzle/schema/users.ts`

Add these fields to the `users` table:
```typescript
export const users = sqliteTable("users", {
  // ... existing fields ...

  role: text("role", { enum: ["admin", "user", "pending"] })
    .notNull()
    .default("pending"),
  isApproved: integer("is_approved", { mode: "boolean" })
    .notNull()
    .default(false),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  approvedBy: text("approved_by").references(() => users.id),
});

export type UserRole = "admin" | "user" | "pending";
```

**Migration**:
1. Run `pnpm db:generate` to create migration
2. Review the SQL in `drizzle/migrations/`
3. Test locally: `pnpm db:push`
4. Seed data: `pnpm db:seed`

#### 1.2 Update Seed Script
**File**: `drizzle/seed.ts`

Add logic to create initial admin:
```typescript
// Read from environment
const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@example.com";

// Create or update admin user
await db.insert(users).values({
  email: adminEmail,
  name: "Admin User",
  role: "admin",
  isApproved: true,
  approvedAt: new Date(),
}).onConflictDoUpdate({
  target: users.email,
  set: {
    role: "admin",
    isApproved: true,
  },
});

// Create test users
await db.insert(users).values([
  { email: "user@example.com", role: "user", isApproved: true },
  { email: "pending@example.com", role: "pending", isApproved: false },
]);
```

#### 1.3 Environment Variable
**File**: `.env.example`

Add:
```bash
# Initial admin user email
INITIAL_ADMIN_EMAIL=your-email@example.com
```

---

### Phase 2: Auth Type Definitions

#### 2.1 Extend NextAuth Types
**New File**: `types/next-auth.d.ts`

```typescript
import type { UserRole } from "@/drizzle/schema/users";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: UserRole;
    isApproved: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      isApproved: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isApproved: boolean;
  }
}
```

---

### Phase 3: Auth Session Enhancement

#### 3.1 Update Auth Config Callbacks
**File**: `lib/auth/config.ts`

**CRITICAL**: This file runs in edge runtime - NO database imports allowed!

Update the callbacks:

```typescript
callbacks: {
  authorized({ auth, request: { nextUrl } }) {
    const isLoggedIn = !!auth?.user;
    const isApproved = auth?.user?.isApproved ?? false;
    const role = auth?.user?.role;

    const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
    const isOnProtected = nextUrl.pathname.startsWith("/api/protected");
    const isOnChat = nextUrl.pathname.startsWith("/examples/chat");
    const isOnChatApi = nextUrl.pathname.startsWith("/api/chat");
    const isOnAdmin = nextUrl.pathname.startsWith("/admin");

    // Admin routes - require admin role
    if (isOnAdmin) {
      if (!isLoggedIn) return false;
      if (!isApproved || role !== "admin") return false;
      return true;
    }

    // Chat routes - require approved user
    if (isOnChat || isOnChatApi) {
      if (!isLoggedIn) return false;
      if (!isApproved) return Response.redirect(new URL("/auth/pending-approval", nextUrl));
      return true;
    }

    // Dashboard and other protected routes - require login only
    if (isOnDashboard || isOnProtected) {
      if (isLoggedIn) return true;
      return false;
    }

    return true;
  },

  jwt({ token, user, trigger }) {
    // On initial signin, user object is available from adapter
    if (user) {
      token.id = user.id;
      token.role = user.role;
      token.isApproved = user.isApproved;
    }

    // On update trigger (after admin approval)
    if (trigger === "update" && user) {
      token.role = user.role;
      token.isApproved = user.isApproved;
    }

    return token;
  },

  session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.isApproved = token.isApproved as boolean;
    }
    return session;
  },
},
```

**Why this works**:
- The DrizzleAdapter (running in Node.js runtime) reads the new fields from the database
- Those fields are passed to the `user` object in the `jwt` callback
- The JWT callback stores them in the token
- The `session` callback exposes them to the client
- The `authorized` callback checks them on every request

---

### Phase 4: Server-Side Auth Guards

#### 4.1 Create Auth Guard Utilities
**New File**: `lib/auth/guards.ts`

```typescript
import { createAuth } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import type { UserRole } from "@/drizzle/schema/users";
import { NextResponse } from "next/server";

export interface AuthGuardResult {
  authorized: boolean;
  user?: {
    id: string;
    email?: string | null;
    role: UserRole;
    isApproved: boolean;
  };
  error?: {
    message: string;
    status: number;
  };
}

/**
 * Server-side auth guard for API routes.
 * Usage: const auth = await requireAuth({ requireApproval: true });
 */
export async function requireAuth(options?: {
  requireApproval?: boolean;
  requiredRole?: UserRole;
}): Promise<AuthGuardResult> {
  const env = await getEnv();
  const { auth } = createAuth(env);
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      error: { message: "Authentication required", status: 401 },
    };
  }

  const { requireApproval = false, requiredRole } = options ?? {};

  if (requireApproval && !session.user.isApproved) {
    return {
      authorized: false,
      user: session.user,
      error: { message: "Account pending approval", status: 403 },
    };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return {
      authorized: false,
      user: session.user,
      error: { message: "Insufficient permissions", status: 403 },
    };
  }

  return {
    authorized: true,
    user: session.user,
  };
}

/**
 * Convenience helper for admin-only routes.
 * Usage: const auth = await requireAdmin();
 */
export async function requireAdmin(): Promise<AuthGuardResult> {
  return requireAuth({ requireApproval: true, requiredRole: "admin" });
}
```

#### 4.2 Create User Management Service
**New File**: `lib/services/user-service.ts`

```typescript
import { users } from "@/drizzle/schema/users";
import type { Database } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface ApproveUserParams {
  userId: string;
  approvedBy: string;
  role?: "user" | "admin";
}

export class UserService {
  constructor(private db: Database) {}

  async approveUser({ userId, approvedBy, role = "user" }: ApproveUserParams) {
    const result = await this.db
      .update(users)
      .set({
        isApproved: true,
        role,
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0];
  }

  async rejectUser(userId: string) {
    await this.db.delete(users).where(eq(users.id, userId));
  }

  async getPendingUsers() {
    return this.db
      .select()
      .from(users)
      .where(eq(users.isApproved, false))
      .orderBy(users.createdAt);
  }

  async updateUserRole(userId: string, role: "user" | "admin") {
    const result = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return result[0];
  }
}
```

---

### Phase 5: API Route Protection

#### 5.1 Protect Chat Stream Endpoint
**File**: `app/api/chat/stream/route.ts`

Add auth check at the beginning of `POST`:

```typescript
import { requireAuth } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);
  const startTime = Date.now();

  // ===== ADD AUTH CHECK HERE =====
  const authResult = await requireAuth({ requireApproval: true });

  if (!authResult.authorized || !authResult.user) {
    logger.warn("Unauthorized chat stream access", {
      error: authResult.error?.message,
    });

    return NextResponse.json(
      { error: authResult.error?.message || "Unauthorized" },
      { status: authResult.error?.status || 401 }
    );
  }

  const userId = authResult.user.id;
  // ===== END AUTH CHECK =====

  try {
    // ... existing validation code ...

    // ... existing streaming code ...

    // UPDATE: Include userId in cost tracking
    await costTracker.track({
      requestId,
      userId,  // ← ADD THIS
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      latencyMs,
      status: "success",
      endpoint: "/api/chat/stream",
    });

    // ... rest of existing code ...
  }
}
```

#### 5.2 Create Admin API Routes

**New File**: `app/api/admin/users/pending/route.ts`

```typescript
import { requireAdmin } from "@/lib/auth/guards";
import { getDatabase } from "@/lib/cloudflare";
import { UserService } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireAdmin();

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error?.message },
      { status: authResult.error?.status }
    );
  }

  const db = await getDatabase();
  const userService = new UserService(db);
  const pendingUsers = await userService.getPendingUsers();

  return NextResponse.json({ users: pendingUsers });
}
```

**New File**: `app/api/admin/users/[userId]/approve/route.ts`

```typescript
import { requireAdmin } from "@/lib/auth/guards";
import { getDatabase } from "@/lib/cloudflare";
import { UserService } from "@/lib/services/user-service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const approveSchema = z.object({
  role: z.enum(["user", "admin"]).optional().default("user"),
});

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const authResult = await requireAdmin();

  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error?.message },
      { status: authResult.error?.status }
    );
  }

  const body = await request.json();
  const parsed = approveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error },
      { status: 400 }
    );
  }

  const db = await getDatabase();
  const userService = new UserService(db);

  try {
    const updatedUser = await userService.approveUser({
      userId: params.userId,
      approvedBy: authResult.user.id,
      role: parsed.data.role,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to approve user" },
      { status: 500 }
    );
  }
}
```

**New File**: `app/api/admin/users/[userId]/reject/route.ts`

```typescript
import { requireAdmin } from "@/lib/auth/guards";
import { getDatabase } from "@/lib/cloudflare";
import { UserService } from "@/lib/services/user-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const authResult = await requireAdmin();

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error?.message },
      { status: authResult.error?.status }
    );
  }

  const db = await getDatabase();
  const userService = new UserService(db);

  try {
    await userService.rejectUser(params.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reject user" },
      { status: 500 }
    );
  }
}
```

---

### Phase 6: UI Pages

#### 6.1 Pending Approval Page
**New File**: `app/auth/pending-approval/page.tsx`

```typescript
import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-gray-500 text-sm hover:text-gray-700">
          ← Back to Home
        </Link>
        <SignOutButton />
      </div>

      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-bold text-2xl">Account Pending Approval</h1>
        </div>

        <p className="mb-4 text-gray-600">
          Thank you for registering! Your account is currently pending approval
          by an administrator.
        </p>

        <p className="mb-6 text-gray-600">
          You will receive access to the chat feature once your account has been
          reviewed and approved. This typically takes 1-2 business days.
        </p>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold text-sm">What happens next?</h3>
          <ul className="space-y-1 text-gray-600 text-sm">
            <li>• An administrator will review your registration</li>
            <li>• You'll be notified via email once approved</li>
            <li>• You can then access all features including the chat</li>
          </ul>
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="inline-block rounded bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
```

#### 6.2 Admin Dashboard Page
**New File**: `app/admin/page.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface PendingUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  async function fetchPendingUsers() {
    try {
      const response = await fetch("/api/admin/users/pending");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setPendingUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(userId: string, role: "user" | "admin" = "user") {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) throw new Error("Failed to approve user");

      await fetchPendingUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve user");
    }
  }

  async function rejectUser(userId: string) {
    if (!confirm("Are you sure you want to reject this user? This will delete their account.")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to reject user");

      await fetchPendingUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject user");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-700">
          ← Back to Dashboard
        </Link>
        <SignOutButton />
      </div>

      <h1 className="mb-2 font-bold text-3xl">Admin Dashboard</h1>
      <p className="mb-8 text-gray-600">Manage user approvals and permissions</p>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          Error: {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">
          Pending Approvals ({pendingUsers.length})
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : pendingUsers.length === 0 ? (
          <p className="text-gray-500">No pending approvals</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-sm">Name</th>
                  <th className="pb-2 text-left font-medium text-sm">Email</th>
                  <th className="pb-2 text-left font-medium text-sm">Registered</th>
                  <th className="pb-2 text-right font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3">{user.name || "N/A"}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => approveUser(user.id, "user")}
                          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                        >
                          Approve as User
                        </button>
                        <button
                          onClick={() => approveUser(user.id, "admin")}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                        >
                          Approve as Admin
                        </button>
                        <button
                          onClick={() => rejectUser(user.id)}
                          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
```

#### 6.3 Add Admin Link to Dashboard
**File**: `app/dashboard/page.tsx`

Add after the existing content:

```typescript
import { createAuth } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import Link from "next/link";

export default async function DashboardPage() {
  const env = await getEnv();
  const { auth } = createAuth(env);
  const session = await auth();

  const isAdmin = session?.user?.role === "admin";

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      {/* ... existing dashboard content ... */}

      {isAdmin && (
        <div className="mt-8 rounded-lg border bg-blue-50 p-6">
          <h3 className="mb-2 font-semibold text-lg">Admin Access</h3>
          <p className="mb-4 text-sm text-gray-600">
            You have administrator privileges. Manage user approvals and permissions.
          </p>
          <Link
            href="/admin"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Admin Dashboard
          </Link>
        </div>
      )}
    </main>
  );
}
```

---

## Testing Checklist

### Local Development Testing

1. **Database Setup**:
   - [ ] `rm local.db` (start fresh)
   - [ ] Set `INITIAL_ADMIN_EMAIL` in `.env`
   - [ ] Run `pnpm db:push`
   - [ ] Run `pnpm db:seed`
   - [ ] Verify admin user created: `sqlite3 local.db "SELECT email, role, is_approved FROM users;"`

2. **Pending User Flow**:
   - [ ] Sign up with Google/GitHub as new user
   - [ ] Try to access `/examples/chat` → redirected to `/auth/pending-approval`
   - [ ] Try to access `/api/chat/stream` → 403 error
   - [ ] Try to access `/admin` → 403 error
   - [ ] Verify `/examples/counter` is still accessible

3. **Admin Flow**:
   - [ ] Sign in with admin email
   - [ ] Access `/admin` successfully
   - [ ] See pending users in the list
   - [ ] Approve a user as "user" role
   - [ ] Verify pending user count decreases

4. **Approved User Flow**:
   - [ ] Sign in as newly approved user
   - [ ] Access `/examples/chat` successfully
   - [ ] Send a chat message → works
   - [ ] Try to access `/admin` → 403 error
   - [ ] Verify cost tracking includes `userId`

5. **JWT Token Verification**:
   - [ ] Inspect session in browser dev tools
   - [ ] Verify `role` and `isApproved` are in session object
   - [ ] Sign out and sign back in → token persists

### Production Deployment Testing

1. **Migration**:
   - [ ] Review migration SQL
   - [ ] Apply to D1: `wrangler d1 migrations apply cf-next-llm-db --remote`
   - [ ] Verify tables updated: `wrangler d1 execute cf-next-llm-db --remote --command "PRAGMA table_info(users);"`

2. **Set Production Admin**:
   - [ ] Set secret: `wrangler secret put INITIAL_ADMIN_EMAIL`
   - [ ] Run seed or manual SQL to create admin user

3. **Deploy and Test**:
   - [ ] `pnpm build && pnpm deploy`
   - [ ] Test same scenarios as local
   - [ ] Monitor logs: `wrangler tail`

---

## Rollback Plan

If issues occur in production:

1. **Immediate Fix** (remove protection):
   ```typescript
   // In lib/auth/config.ts, simplify authorized callback:
   if (isOnChat || isOnChatApi) {
     return isLoggedIn; // Remove approval check temporarily
   }
   ```

2. **Approve All Existing Users**:
   ```sql
   UPDATE users
   SET is_approved = 1, role = 'user', approved_at = CURRENT_TIMESTAMP
   WHERE is_approved = 0;
   ```

3. **Redeploy** previous version if needed

4. **Investigate** and fix root cause

---

## Known Edge Cases & Solutions

### Edge Case 1: Stale JWT After Approval
**Issue**: Admin approves user, but user's JWT still shows `isApproved=false` until they log out.

**Solution**: Document this behavior. User must sign out and sign back in after approval for the change to take effect. (Alternative: implement JWT refresh trigger, but adds complexity.)

### Edge Case 2: Demo Credentials Provider
**Issue**: The hardcoded demo user in `lib/auth/config.ts` bypasses the database.

**Solution**: Create a demo user in the seed script with admin role. Remove the hardcoded logic in production.

### Edge Case 3: Middleware Redirect Loop
**Issue**: Could redirect loop if pending-approval page is also protected.

**Solution**: The `authorized` callback returns `true` for all `/auth/*` paths (fallthrough at the end), so no loop occurs.

### Edge Case 4: Cost Tracking Schema
**Issue**: `usage_logs` table already has optional `user_id` field.

**Solution**: Perfect! Just ensure chat API always includes it after auth check. Historical logs without userId are fine.

---

## Security Considerations

✅ **What's Protected**:
- JWT signed with `AUTH_SECRET` - role/approval cannot be tampered
- All chat routes require authentication + approval
- Admin routes require admin role
- API returns proper HTTP status codes (401, 403)

⚠️ **What's Not Covered** (Future Enhancements):
- Rate limiting per user
- Email notifications for approval status
- Audit logging for admin actions
- JWT token refresh after approval
- Password hashing for credentials provider (demo only)

---

## Files to Create/Modify

### New Files (7)
1. `types/next-auth.d.ts` - Type definitions
2. `lib/auth/guards.ts` - Auth guard utilities
3. `lib/services/user-service.ts` - User management service
4. `app/auth/pending-approval/page.tsx` - Pending approval UI
5. `app/admin/page.tsx` - Admin dashboard UI
6. `app/api/admin/users/pending/route.ts` - Get pending users API
7. `app/api/admin/users/[userId]/approve/route.ts` - Approve user API
8. `app/api/admin/users/[userId]/reject/route.ts` - Reject user API

### Modified Files (6)
1. `drizzle/schema/users.ts` - Add role/approval fields
2. `drizzle/seed.ts` - Create admin user
3. `.env.example` - Add INITIAL_ADMIN_EMAIL
4. `lib/auth/config.ts` - Update callbacks for RBAC
5. `app/api/chat/stream/route.ts` - Add auth check
6. `app/dashboard/page.tsx` - Add admin link

### Migration Files (1)
- Auto-generated by `pnpm db:generate` after schema update

---

## Critical Implementation Notes

1. **Edge Runtime Constraint**: `lib/auth/config.ts` runs in edge runtime - NEVER import database or Node.js modules there

2. **JWT Contains Everything**: The adapter populates `user.role` and `user.isApproved` from the database, then JWT callback stores them in the token

3. **Middleware Runs on Every Request**: The `authorized` callback checks JWT on every request - no database query needed

4. **Node.js Runtime for Admin APIs**: All `/api/admin/*` routes need `export const runtime = "nodejs"` for database access

5. **Boolean in SQLite**: Use `integer("field", { mode: "boolean" })` for SQLite/D1 compatibility

6. **Initial Admin Setup**: Must set `INITIAL_ADMIN_EMAIL` before running seed script

---

## Success Criteria

- ✅ Only approved users can access `/examples/chat`
- ✅ Unapproved users see friendly pending page
- ✅ Admin can view and approve pending users
- ✅ Cost tracking includes user ID for all chat requests
- ✅ `/examples/counter` remains public
- ✅ JWT includes role and approval status
- ✅ Works in both development (SQLite) and production (D1)

---

**Ready for implementation!** All questions resolved, plan is complete and actionable.
