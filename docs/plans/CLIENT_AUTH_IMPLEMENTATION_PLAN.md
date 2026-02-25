# Fast Eat Client — Client Login Implementation Plan

Last updated: 2026-02-24
Owner: Frontend + API team

## 1) Confirmed Product Decisions

- Session source of truth: **Supabase Auth session**.
- Registration model for clients: **self-registration form** (no invitation required).
- Identity policy: **1 account per user**.
- Legacy compatibility: **not required** (pre-launch, safe to break old customer links).
- Google option: include **Sign in with Google** in login page.
- Startup UX goal: load client context automatically on app open; user should not re-login on every app open.

## 2) Reuse Strategy from Restaurant App

Use the working restaurant login/registration flow as a baseline for API payloads and token handling patterns:

- Reference auth service: `restaurant-partner-p/src/services/auth/auth-service.ts`
- Reference branch auth context (token/session restoration pattern): `restaurant-partner-p/src/contexts/BranchAuthContext.tsx`

What to reuse:
- Request/response structure discipline (`user`, `session`, `message`).
- Explicit loading/error state transitions.
- Single place for token/session lifecycle events.

What to change for client app:
- No invitation verification step for registration.
- Add client orchestration call after auth success (create/update `user_profiles` + `customers` + optional `customer_address`).
- Hydrate consumer context at startup (favorites/history/search/settings).

## 3) Frontend Scope (Files to Create/Update)

## 3.1 Auth foundation

- Update `src/lib/supabase.ts`
  - Ensure proper browser auth options (`persistSession`, auto refresh behavior).
  - Keep single shared client instance.
- Create `src/lib/supabase-auth-server.ts`
  - Server-side client with cookie-aware session handling for route handlers.
- Create `src/app/auth/callback/route.ts`
  - Exchange OAuth code for session (PKCE callback flow).
- Create `middleware.ts`
  - Session refresh and optional route protection policy.

## 3.2 Auth UI

- Create `src/app/auth/sign-in/page.tsx`
- Create `src/app/auth/sign-up/page.tsx`
- Add actions:
  - Email/password login.
  - Email/password registration.
  - Google OAuth (`provider: 'google'`).
- Behavior requirements:
  - Primary action: submit auth form or continue with Google.
  - Secondary action: switch login/register mode.
  - Fallbacks: clear user-facing error when provider/session unavailable.

## 3.3 App bootstrap + store hydration

- Update `src/store.ts`
  - Add auth slice: `authUserId`, `authEmail`, `isAuthenticated`, `isHydrated`.
  - Keep tokens out of custom store; rely on Supabase session.
- Create `src/components/AuthBootstrap.tsx`
  - On app load:
    1. Get current Supabase session.
    2. If authenticated, call API context endpoint.
    3. Hydrate profile/history/favorites/search/settings.
- Update `src/app/layout.tsx`
  - Mount bootstrap provider once.

## 3.4 Existing flow adaptation

- Update onboarding and prompt components to stop using phone as auth gate:
  - `src/components/MainApp.tsx`
  - `src/components/PhonePrompt.tsx`
  - `src/components/ProfileCompletionModal.tsx`
- Keep address optional at login; request later where needed (checkout/profile completion).

## 3.5 Security hardening on client-side API routes

Require authenticated ownership checks before sensitive mutations:

- `src/app/api/orders/[orderId]/bids/[bidId]/accept/route.ts`
- `src/app/api/orders/[orderId]/bids/[bidId]/counter/route.ts`
- `src/app/api/orders/[orderId]/confirm-delivery/route.ts`

## 4) Data Loading Lifecycle (Target Behavior)

On app open:
1. Read Supabase session.
2. If no session: show login page.
3. If session exists: call `GET /consumer/v1/me/context`.
4. Hydrate store in this order:
   - profile
   - address (if available)
   - favorites
   - search history
   - orders history summary
   - settings
5. Render app as authenticated.

On logout:
- Call `supabase.auth.signOut()`.
- Clear hydrated client data from store.

## 5) Fixes for Open Risks

### Risk 1 (must fix)
`ensureUserProfile` currently inserts without `role_id` in API service; this breaks with current DB constraints.

Plan impact:
- Backend must resolve client role ID and include `role_id` in every `user_profiles` upsert.

### Risk 2 (your decision: one account per user)
Enforce one-to-one between auth user and customer profile.

Plan impact:
- Add `customers.auth_user_id` unique FK to auth user.
- Client app always loads customer by authenticated user id, never by free-form phone lookups.

### Risk 3 (expanded explanation)
PWA/service-worker caching can serve stale responses from a previous user session if auth-sensitive API routes are cached as generic GET responses.

Plan impact:
- Exclude auth-sensitive endpoints from cache (or use network-first with strict cache invalidation).
- Trigger cache purge on login/logout.

## 6) Acceptance Criteria (Frontend)

- User can register and login with email/password.
- User can login with Google.
- User remains logged in after app reopen/refresh until explicit logout or session expiry.
- On first auth, profile/customer records are created by orchestration endpoint.
- Address is optional during auth and can be added later.
- Authenticated users auto-load favorites/history/search/settings on startup.
- Sensitive order mutation endpoints reject unauthenticated or non-owner requests.
