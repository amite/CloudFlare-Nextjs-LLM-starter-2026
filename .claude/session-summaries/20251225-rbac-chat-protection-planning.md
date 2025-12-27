# Session Summary: RBAC Chat Protection Planning
**Generated**: 2025-12-25
**Project**: Cloudflare Next.js LLM Boilerplate

---

## Session Overview

Successfully planned implementation of role-based access control (RBAC) to protect the LLM chat feature from unauthorized access. The app is currently deployed and working in production, but the chat endpoint is completely public, allowing anyone to incur LLM API costs.

**Production Status**: App deployed and working at `https://cf-next-llm-app.amit-erandole.workers.dev` (taken down for the night via `wrangler delete`, will redeploy tomorrow with `pnpm deploy`).

---

## Current State Analysis

### What's Working
- ✅ Next.js 15.1.11 + Cloudflare Workers deployment successful
- ✅ Auth.js v5 with JWT sessions (Google OAuth configured)
- ✅ D1 database connected and working
- ✅ `/dashboard` protected by middleware
- ✅ LLM chat streaming functional at `/examples/chat`

### Security Gap Identified
```
PUBLIC (anyone can access):
├── /examples/chat          ← Chat UI (costs money!)
└── /api/chat/stream        ← LLM API endpoint (costs money!)

PROTECTED (authenticated only):
├── /dashboard
└── /api/protected/*
```

**Problem**: Anyone can use the chat and rack up OpenAI/Gemini API costs.

---

## Key Technical Decisions

### 1. Manual Approval Workflow
**Decision**: Implement manual admin approval for all new users
- New signups default to `role="pending"`, `isApproved=false`
- Admin reviews and approves each user individually
- Only approved users can access chat features

**Rejected Alternatives**:
- Automatic approval by email domain (user wanted full control)
- Invite-only system (user preferred signup + approval)
- Closed whitelist (user wanted proper approval UI)

### 2. Role System Architecture
**Decision**: Three-role system: `admin` | `user` | `pending`
- **Admin**: Can approve users, access admin dashboard, use chat
- **User**: Can use chat after approval
- **Pending**: New signups, cannot access chat until approved

**Why**: Provides flexibility for future permissions while keeping implementation simple.

### 3. Edge Runtime Compatibility Strategy
**Critical Constraint**: Auth config (`lib/auth/config.ts`) runs in edge runtime - **CANNOT import database or Node.js modules**

**Solution**:
- DrizzleAdapter (runs in Node.js runtime) reads role/approval fields from database
- JWT callback receives populated `user` object with all fields
- JWT callback stores `role` and `isApproved` in token (no DB access needed)
- Middleware `authorized` callback checks JWT on every request (no DB query)

**Architecture**:
```
Database (Node.js runtime)
    ↓
DrizzleAdapter populates user.role, user.isApproved
    ↓
JWT callback (edge runtime) stores in token
    ↓
Middleware (edge runtime) checks token
    ↓
Allow/deny access
```

### 4. Protection Scope
**Decision**: Only protect chat, keep counter public
- `/examples/chat` → requires authentication + approval
- `/api/chat/stream` → requires authentication + approval
- `/examples/counter` → remains public (harmless demo)

### 5. User Experience for Unapproved Users
**Decision**: Show friendly "Pending Approval" page at `/auth/pending-approval`
- Explains approval process
- Provides timeline expectations (1-2 business days)
- Links back to dashboard
- Better UX than generic 403 error

---

## Implementation Plan Summary

**Full detailed plan**: `artifacts/wip/plans/rbac-chat-protection.md`

### Database Schema Changes
Add to `users` table in `drizzle/schema/users.ts`:
```typescript
role: text("role", { enum: ["admin", "user", "pending"] })
  .notNull()
  .default("pending"),
isApproved: integer("is_approved", { mode: "boolean" })
  .notNull()
  .default(false),
approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
approvedBy: text("approved_by").references(() => users.id),
```

### Auth Session Enhancement
Update `lib/auth/config.ts` callbacks:
- `jwt()`: Store `role` and `isApproved` from user object into token
- `session()`: Expose `role` and `isApproved` to client
- `authorized()`: Check approval status for chat routes, admin role for admin routes

### New TypeScript Types
Create `types/next-auth.d.ts` to extend Auth.js:
```typescript
interface User {
  role: UserRole;
  isApproved: boolean;
}
interface Session {
  user: { /* ... */ role: UserRole; isApproved: boolean; }
}
interface JWT {
  role: UserRole;
  isApproved: boolean;
}
```

### Server-Side Auth Guards
Create `lib/auth/guards.ts`:
- `requireAuth({ requireApproval: true })` - for chat endpoints
- `requireAdmin()` - for admin endpoints
- Returns `{ authorized, user, error }` with proper status codes

### API Protection
Update `app/api/chat/stream/route.ts`:
```typescript
const authResult = await requireAuth({ requireApproval: true });
if (!authResult.authorized) {
  return NextResponse.json({ error }, { status: 403 });
}
const userId = authResult.user.id; // Include in cost tracking
```

### Admin Dashboard
Create `/admin` page with:
- List of pending users (name, email, registration date)
- Approve as User / Approve as Admin / Reject buttons
- Calls `/api/admin/users/[userId]/approve` or `/reject`

### User Management Service
Create `lib/services/user-service.ts`:
- `approveUser()` - sets `isApproved=true`, updates role
- `rejectUser()` - deletes user from database
- `getPendingUsers()` - lists all unapproved users

---

## Files to Create/Modify

### New Files (8)
1. `types/next-auth.d.ts` - Auth type extensions
2. `lib/auth/guards.ts` - Server-side auth utilities
3. `lib/services/user-service.ts` - User approval logic
4. `app/auth/pending-approval/page.tsx` - Pending approval UI
5. `app/admin/page.tsx` - Admin dashboard
6. `app/api/admin/users/pending/route.ts` - List pending users
7. `app/api/admin/users/[userId]/approve/route.ts` - Approve user
8. `app/api/admin/users/[userId]/reject/route.ts` - Reject user

### Modified Files (6)
1. `drizzle/schema/users.ts` - Add role/approval fields
2. `drizzle/seed.ts` - Create initial admin user
3. `.env.example` - Add `INITIAL_ADMIN_EMAIL`
4. `lib/auth/config.ts` - Update JWT/session/authorized callbacks
5. `app/api/chat/stream/route.ts` - Add auth check + userId tracking
6. `app/dashboard/page.tsx` - Add admin dashboard link for admins

---

## Environment Variables

### New Required Variable
```bash
# Set in .env for development
INITIAL_ADMIN_EMAIL=your-email@example.com

# Set in production
wrangler secret put INITIAL_ADMIN_EMAIL
```

This email will be created as an admin user during database seeding.

---

## Migration Strategy

### Local Development
1. `rm local.db` (start fresh)
2. Set `INITIAL_ADMIN_EMAIL` in `.env`
3. `pnpm db:generate` (create migration)
4. `pnpm db:push` (apply to local SQLite)
5. `pnpm db:seed` (create admin user)

### Production (Cloudflare D1)
1. Review migration SQL in `drizzle/migrations/`
2. `wrangler d1 migrations apply cf-next-llm-db --remote`
3. `wrangler secret put INITIAL_ADMIN_EMAIL`
4. Run seed or manual SQL to create admin user
5. `pnpm build && pnpm deploy`

---

## Testing Checklist

### Pending User Flow
- [ ] Sign up with new account (Google OAuth)
- [ ] Try to access `/examples/chat` → redirected to `/auth/pending-approval`
- [ ] Try to access `/api/chat/stream` → 403 Forbidden
- [ ] Try to access `/admin` → 403 Forbidden
- [ ] Verify `/examples/counter` is still accessible (public)

### Admin Flow
- [ ] Sign in with `INITIAL_ADMIN_EMAIL` account
- [ ] Access `/admin` successfully
- [ ] See pending users in list
- [ ] Approve user as "user" role
- [ ] Verify user disappears from pending list

### Approved User Flow
- [ ] Sign in as newly approved user
- [ ] Access `/examples/chat` successfully
- [ ] Send chat message → works
- [ ] Verify cost tracking includes `userId`
- [ ] Try to access `/admin` → 403 Forbidden

### Edge Cases
- [ ] Unapproved user has `isApproved=false` in session
- [ ] Admin has `role=admin` in session
- [ ] JWT persists across page reloads
- [ ] Sign out and sign back in → token refreshes correctly

---

## Known Edge Cases & Solutions

### Edge Case: Stale JWT After Approval
**Issue**: Admin approves user, but their JWT still shows `isApproved=false` until they log out.

**Solution**: Document this behavior. User must sign out and sign back in after approval. (Alternative would be JWT refresh trigger, but adds complexity - keep simple for now.)

### Edge Case: Demo Credentials Provider
**Issue**: Hardcoded demo user in `lib/auth/config.ts` bypasses database.

**Solution**:
- Create demo user in seed script with admin role
- Keep demo logic for local testing
- Document that it should be removed in production

### Edge Case: Cost Tracking Schema
**Issue**: `usage_logs` table already has optional `userId` field.

**Solution**: Perfect! Just ensure chat API always includes it after auth check. Historical logs without userId are fine.

---

## Security Considerations

### What's Protected ✅
- JWT signed with `AUTH_SECRET` - role/approval cannot be tampered
- All chat routes require authentication + approval
- Admin routes require admin role
- Proper HTTP status codes (401 Unauthorized, 403 Forbidden)
- Database integrity via foreign keys

### Future Enhancements ⚠️
- Rate limiting per user
- Email notifications for approval status changes
- Audit logging for admin actions
- Password hashing for credentials provider (currently demo only)
- JWT refresh token rotation

---

## Critical Implementation Constraints

1. **Edge Runtime**: `lib/auth/config.ts` runs in edge runtime - NEVER import database, better-sqlite3, or Node.js modules there

2. **JWT Contains Everything**: The adapter populates `user.role` and `user.isApproved`, then JWT callback stores them. No database access in middleware.

3. **Middleware Runs Every Request**: The `authorized` callback checks JWT on every protected route - must be performant (no DB queries).

4. **Node.js Runtime for Admin**: All `/api/admin/*` routes need `export const runtime = "nodejs"` for database operations.

5. **Boolean in SQLite/D1**: Use `integer("field", { mode: "boolean" })` for cross-database compatibility.

---

## Production Deployment Notes

### Current Production State
- App deployed and working at `https://cf-next-llm-app.amit-erandole.workers.dev`
- Google OAuth configured with production callback URL
- D1 database ID: `3277fc2f-b1d4-45a0-927f-071fa6690b81`
- Database name: `cf-next-llm-db`
- R2 bucket: `cf-next-llm-logs`
- **Status**: Taken down for the night (via `wrangler delete`)

### To Redeploy Tomorrow
```bash
pnpm deploy
```

All bindings (D1, R2) and secrets remain intact.

### Rollback Plan (If Issues)
If RBAC causes problems in production:

1. **Immediate fix** - simplify `authorized` callback:
   ```typescript
   if (isOnChat || isOnChatApi) {
     return isLoggedIn; // Remove approval check
   }
   ```

2. **Approve all existing users**:
   ```sql
   UPDATE users SET is_approved = 1, role = 'user' WHERE is_approved = 0;
   ```

3. **Redeploy** and investigate

---

## Google OAuth Configuration

Production URLs already configured:
- **Authorized JavaScript Origin**: `https://cf-next-llm-app.amit-erandole.workers.dev`
- **Authorized Redirect URI**: `https://cf-next-llm-app.amit-erandole.workers.dev/api/auth/callback/google`

---

## Active Tasks

### Before Implementation
- [ ] Review the detailed plan at `artifacts/wip/plans/rbac-chat-protection.md`
- [ ] Confirm approach with user (plan reviewed, ready to proceed)
- [ ] Set `INITIAL_ADMIN_EMAIL` in local `.env`

### Implementation Steps (In Order)
- [ ] Update `drizzle/schema/users.ts` with new fields
- [ ] Run `pnpm db:generate` to create migration
- [ ] Update `drizzle/seed.ts` with admin user creation
- [ ] Create `types/next-auth.d.ts` for type definitions
- [ ] Update `lib/auth/config.ts` callbacks (JWT, session, authorized)
- [ ] Create `lib/auth/guards.ts` utilities
- [ ] Create `lib/services/user-service.ts` service
- [ ] Update `app/api/chat/stream/route.ts` with auth check
- [ ] Create `/api/admin/*` routes (pending, approve, reject)
- [ ] Create `app/auth/pending-approval/page.tsx` UI
- [ ] Create `app/admin/page.tsx` dashboard
- [ ] Update `app/dashboard/page.tsx` with admin link
- [ ] Update `.env.example` documentation

### Testing
- [ ] Test locally with fresh database
- [ ] Verify all user flows (pending, admin, approved)
- [ ] Test edge cases (stale JWT, demo user, etc.)
- [ ] Apply migration to production D1
- [ ] Deploy to production
- [ ] Smoke test in production

---

## Next Session Actions

1. **Review Plan**: Read `artifacts/wip/plans/rbac-chat-protection.md` in detail
2. **Confirm Approach**: Approve or request changes to the plan
3. **Begin Implementation**: Start with database schema changes
4. **Test Incrementally**: Verify each phase before moving to next

---

## Key Documentation References

- **Main Plan**: `artifacts/wip/plans/rbac-chat-protection.md` (comprehensive implementation guide)
- **Auth Docs**: `artifacts/docs/Auth-1-0.md` (authentication system overview)
- **Auth Files**: `artifacts/docs/AUTH-FILES-REFERENCE.md` (file-by-file reference)
- **Deployment**: `artifacts/docs/DEPLOYMENT_SUCCESS.md` (successful production deployment notes)
- **Project Guide**: `CLAUDE.md` (codebase structure and conventions)

---

**Session End**: Plan complete, production down for the night, ready to implement tomorrow.
