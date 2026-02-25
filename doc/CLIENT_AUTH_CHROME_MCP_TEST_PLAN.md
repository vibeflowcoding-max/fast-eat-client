# Fast Eat Client — Chrome DevTools MCP Test Plan (Executable)

Last updated: 2026-02-24
Target: Run manually by Copilot with chrome-devtools-mcp after implementation.

## 1) Test Objective

Validate end-to-end client authentication UX:
- Email/password login and registration.
- Google login callback flow.
- First-login orchestration behavior.
- Session persistence (single login experience on phone/PWA-like flow).
- Startup hydration of client context.

## 2) Preconditions

- Frontend running: `fast-eat-client` (`npm run dev`).
- API running: `fast-eat-api-nestjs` (dev mode).
- Supabase Google provider configured (see setup guide).
- Two test accounts available:
  - `new-client@test.com` (fresh user)
  - `returning-client@test.com` (already orchestrated)

## 3) MCP Execution Checklist

## 3.1 UI Render and Form Behavior

1. Navigate to `/auth/sign-in`.
2. Assert visible elements:
   - Email input, password input, login button.
   - Link/button to switch to registration.
   - Google login button.
3. Submit empty form and invalid values.
4. Validate inline validation and disabled/loading states.

Expected:
- No silent failures.
- Clear user-visible errors.

## 3.2 Email Registration Flow

1. Go to `/auth/sign-up`.
2. Register with new account.
3. Confirm redirect to authenticated area.
4. Open Network tab and verify orchestration endpoint succeeded.

Expected:
- Session established.
- `me/context` (or equivalent) fetched and used to hydrate UI.

## 3.3 Email Login Flow

1. Sign out.
2. Login with returning client.
3. Verify app loads personalized data on first screen load.

Expected:
- Favorites/history/search/settings visible where applicable.

## 3.4 Google OAuth Flow

1. Click “Continue with Google”.
2. Complete provider flow.
3. Verify callback route receives `code` and exchanges session.
4. Verify redirect to app home.

Expected:
- Authenticated session present.
- No callback error page.

## 3.5 Session Persistence (single-login goal)

1. With authenticated user, refresh page.
2. Close and reopen page/tab.
3. Reopen app route directly.

Expected:
- User remains authenticated.
- No forced login prompt.
- Context rehydration occurs automatically.

## 3.6 Unauthorized Access and Ownership Checks

1. Attempt sensitive endpoint action without session.
2. Attempt action with a session that does not own target order.

Expected:
- 401/403 responses.
- No state mutation.

## 4) PWA/Cache Safety Validation

1. Login as User A and load profile-sensitive pages.
2. Logout.
3. Login as User B.
4. Verify prior user data is not shown (including after refresh).

Expected:
- No cross-user stale data from cache.

## 5) Evidence to Capture

For each scenario:
- One screenshot (UI success/failure state).
- One network capture for key auth/context requests.
- Console log snapshot if errors occur.

## 6) Pass/Fail Criteria

Pass when all are true:
- Login/register/google flows work.
- First-login orchestration succeeds.
- Session persists across reopen/refresh.
- Context auto-load works.
- Sensitive writes are protected.
- No cross-user cached data leaks.
