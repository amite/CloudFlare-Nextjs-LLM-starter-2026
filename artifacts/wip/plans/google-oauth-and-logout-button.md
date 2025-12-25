# Google OAuth Setup and Logout Button Implementation Plan

**Created**: 2025-12-25
**Status**: Ready for Implementation

---

## Overview

This plan covers two related tasks:
1. **Add a logout button to the dashboard** (currently missing)
2. **Enable Google OAuth sign-in** (already configured, just needs credentials)

---

## Current State

### What Already Works ✅
- Google OAuth provider is **already configured** in [lib/auth/config.ts](lib/auth/config.ts:30-33)
- Google sign-in button **already exists** in [app/auth/signin/page.tsx](app/auth/signin/page.tsx:80-106)
- Auth.js v5 with D1 adapter is fully set up
- Middleware protects `/dashboard` route
- Email/password authentication works (demo: `demo@example.com` / `password123`)

### What's Missing ❌
- No logout/sign-out button on dashboard or anywhere else
- Google OAuth credentials not set in `.env` file
- Empty sign-out page directory exists but has no component

---

## Task 1: Add Logout Button to Dashboard

### Implementation Steps

#### Step 1.1: Create Sign Out Button Component
**File**: `components/auth/sign-out-button.tsx` (new file)

**What to build**:
- Client component (`"use client"`)
- Button that calls `signOut()` from `next-auth/react`
- Loading state during sign-out
- Consistent styling with existing auth buttons
- Redirect to home page after sign-out

**Design considerations**:
- Use same button styling as sign-in page buttons
- Include optional icon (logout/exit icon)
- Handle sign-out errors gracefully
- Show loading spinner during transition

**Dependencies**:
- `next-auth/react` (already installed)
- React hooks for loading state

#### Step 1.2: Update Dashboard Page
**File**: [app/dashboard/page.tsx](app/dashboard/page.tsx)

**Changes needed**:
1. Import the new `SignOutButton` component
2. Add button to page header area (top-right recommended)
3. Consider layout: aligned right in a flex container with the title

**Current structure**:
```
<main>
  <h1>Dashboard</h1>
  <p>Protected page description</p>
  <div>Links to examples</div>
  <section>Auth.js info</section>
</main>
```

**Proposed structure**:
```
<main>
  <div className="flex justify-between items-center mb-8">
    <h1>Dashboard</h1>
    <SignOutButton />
  </div>
  <p>Protected page description</p>
  <div>Links to examples</div>
  <section>Auth.js info</section>
</main>
```

#### Step 1.3: (Optional) Create Sign-Out Page
**File**: `app/auth/signout/page.tsx` (directory exists but empty)

**Purpose**:
- Landing page after sign-out
- Show "You have been signed out" message
- Link back to home or sign-in page

**Note**: This is optional since we can redirect directly to home page in the button

---

## Task 2: Enable Google OAuth Authentication

### Prerequisites
- Google Cloud Console access ✅ (user confirmed they're logged in with billing)
- Google Cloud project (create if needed)

### Step 2.1: Get Google OAuth Credentials

**Where to go**: [Google Cloud Console](https://console.developers.google.com/)

**Detailed Instructions**:

1. **Select or Create a Project**
   - Go to https://console.cloud.google.com/
   - Use existing project OR create new project for this app
   - Note the project name/ID

2. **Enable Google+ API** (if not already enabled)
   - Navigate to: APIs & Services → Library
   - Search for "Google+ API" or "Google Identity"
   - Click "Enable"

3. **Configure OAuth Consent Screen**
   - Navigate to: APIs & Services → OAuth consent screen
   - Select **External** user type (unless you have Google Workspace)
   - Fill in required fields:
     - App name: "CF Next LLM Boilerplate" (or your app name)
     - User support email: your email
     - Developer contact email: your email
   - Add scopes:
     - `openid`
     - `email`
     - `profile`
   - Save and continue

4. **Create OAuth 2.0 Credentials**
   - Navigate to: APIs & Services → Credentials
   - Click: "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "CF Next LLM App - Local Dev" (or your preference)

   **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`

   **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - (For production later: `https://your-domain.workers.dev/api/auth/callback/google`)

   - Click "Create"
   - **Copy the Client ID and Client Secret** immediately

5. **Add Test Users** (for External app type)
   - Go back to OAuth consent screen → Test users
   - Add your Google email address
   - Click "Save"

### Step 2.2: Update Environment Variables

**File**: `.env`

**Changes**:
1. Uncomment the Google OAuth lines (currently commented in `.env.example`)
2. Add the credentials from Step 2.1

```env
# Google OAuth - https://console.developers.google.com/
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**Important**:
- Never commit `.env` to git (already in `.gitignore`)
- These are for local development only
- For production, use `wrangler secret put GOOGLE_CLIENT_ID` and `wrangler secret put GOOGLE_CLIENT_SECRET`

### Step 2.3: Test Google OAuth Flow

**Manual testing steps**:
1. Restart dev server: `pnpm dev` (required after env var changes)
2. Visit http://localhost:3000/auth/signin
3. Click "Sign in with Google" button
4. You should see Google's OAuth consent screen
5. Select your test user account
6. Grant permissions
7. Should redirect to `/dashboard` with active session
8. Test the new logout button
9. Should sign out and redirect to home page

**Error scenarios to test**:
- Invalid credentials → should show error message
- User cancels OAuth flow → should return to sign-in page
- Sign-out while on dashboard → should redirect and clear session

---

## File Changes Summary

### New Files
1. `components/auth/sign-out-button.tsx` - Client component for logout
2. (Optional) `app/auth/signout/page.tsx` - Sign-out confirmation page

### Modified Files
1. [app/dashboard/page.tsx](app/dashboard/page.tsx) - Add logout button to header
2. `.env` - Add Google OAuth credentials

### No Changes Needed
- [lib/auth/config.ts](lib/auth/config.ts) - Google provider already configured ✅
- [app/auth/signin/page.tsx](app/auth/signin/page.tsx) - Google button already present ✅
- [middleware.ts](middleware.ts) - Already protecting dashboard ✅

---

## Testing Checklist

### Logout Button Tests
- [ ] Button appears on dashboard page
- [ ] Button shows loading state when clicked
- [ ] Sign-out clears session
- [ ] Redirect to home page works
- [ ] Accessing `/dashboard` after logout redirects to sign-in
- [ ] Button styling matches design system

### Google OAuth Tests
- [ ] Google button appears on sign-in page (already exists)
- [ ] Clicking button opens Google OAuth consent screen
- [ ] Successful authentication creates user session
- [ ] Redirect to dashboard works after OAuth
- [ ] User info stored in D1 database
- [ ] Subsequent logins recognize existing user
- [ ] Sign-out clears Google OAuth session

---

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use Cloudflare secrets for production: `wrangler secret put`
   - Rotate secrets if accidentally exposed

2. **Redirect URIs**
   - Only add trusted domains to authorized redirects
   - Use HTTPS for production redirects
   - Validate callback URLs in Auth.js config

3. **OAuth Consent Screen**
   - Only request necessary scopes (openid, email, profile)
   - Keep app in testing mode until ready for production
   - Add privacy policy URL before going to production

4. **Session Management**
   - JWT strategy is edge-compatible
   - Session tokens stored in HTTP-only cookies
   - Middleware validates sessions on protected routes

---

## Production Deployment Notes

When deploying to Cloudflare Workers:

1. **Update OAuth Credentials**
   - Add production domain to authorized origins
   - Add production callback URL: `https://your-app.workers.dev/api/auth/callback/google`

2. **Set Cloudflare Secrets**
   ```bash
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   ```

3. **Update OAuth Consent Screen**
   - Add production domain
   - Move from "Testing" to "In Production" status (requires verification)
   - Add privacy policy and terms of service URLs

4. **Update Environment Variables**
   - Set `NEXT_PUBLIC_APP_URL` to production domain
   - Ensure `AUTH_SECRET` is set in Cloudflare secrets

---

## Additional Notes

### Why Google OAuth is Already Configured

The boilerplate was designed with OAuth in mind:
- Auth.js v5 supports multiple providers out of the box
- D1 adapter handles user persistence automatically
- Sign-in page was built with OAuth buttons already included
- The only missing piece is the environment variables

### Sign-Out Button Design

Recommended approach:
- Place in top-right of dashboard header
- Use destructive styling (red/danger color) to indicate action
- Include icon for better UX (logout/exit icon)
- Show loading state to prevent double-clicks
- Redirect to home page (not sign-in page) after sign-out

### Auth.js v5 Notes

- Uses JWT strategy (required for edge runtime)
- Session tokens are HTTP-only cookies
- No client-side SessionProvider needed for server components
- Client components can use `useSession()` hook if needed

---

## References

### Documentation Links
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Auth.js Google Provider](https://authjs.dev/reference/core/providers/google)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)

### Critical Files for Reference
- [lib/auth/config.ts](lib/auth/config.ts) - Auth providers configuration
- [app/auth/signin/page.tsx](app/auth/signin/page.tsx) - Sign-in page with OAuth buttons
- [middleware.ts](middleware.ts) - Route protection
- [app/dashboard/page.tsx](app/dashboard/page.tsx) - Dashboard page to add logout button

### Environment Variables
See [.env.example](.env.example) lines 32-34 for Google OAuth template

---

## Success Criteria

The implementation is complete when:

1. ✅ Dashboard has a visible, functional logout button
2. ✅ Clicking logout clears session and redirects user
3. ✅ Google OAuth credentials are configured in `.env`
4. ✅ Google sign-in button successfully authenticates users
5. ✅ New Google users are created in D1 database
6. ✅ Returning Google users are recognized
7. ✅ All authentication flows work end-to-end
8. ✅ No console errors during auth flows

---

**End of Plan**
