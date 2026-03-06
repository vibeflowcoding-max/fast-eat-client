# Fast Eat Client — Security, Performance, and Maintainability Remediation Plan

Last updated: 2026-03-05
Owner: Frontend + API team
Status: Proposed

## 1) Objective

Turn the current review findings into an implementation sequence that improves:

- access control and privacy protections
- request-path safety and backend proxy design
- session and persisted-state hygiene
- request lifecycle reliability
- home-page performance and maintainability
- configuration correctness, type safety, and accessibility

This plan is intentionally execution-oriented. It is not a review summary. Each section defines the target architecture, file impact, implementation steps, validation strategy, and rollout order.

## 2) Source Findings Covered by This Plan

This remediation plan covers the verified findings in these areas:

1. Customer address ownership is currently derived from caller-supplied phone numbers.
2. Generic client-facing proxy routes forward caller-controlled targets, paths, and test-mode switches.
3. Persisted client state retains private and session-scoped data after logout.
4. Restaurant request cancellation is incomplete, allowing stale in-flight updates.
5. The home page and rail builder perform too much client-side orchestration in a single render path.
6. Supabase browser configuration hides environment misconfiguration with placeholder credentials.
7. TypeScript strict mode is disabled.
8. The root layout disables user zoom on mobile.

## 3) Success Criteria

The remediation work is complete when all of the following are true:

- Sensitive customer data can only be read or written by an authenticated owner.
- No generic proxy route accepts arbitrary upstream path or environment selection from the browser.
- Logout removes private user data and session-specific operational state from persistent storage.
- Hook-based fetches can be cancelled correctly on dependency changes and unmount.
- Home route rendering and list derivation are split into smaller, measurable units with lower client cost.
- Environment misconfiguration fails fast instead of silently using placeholders.
- TypeScript strictness is raised with a controlled migration plan.
- Mobile users can zoom the interface again.
- Tests cover the affected server routes, store behavior, and high-risk hooks.

## 4) Affected Files and Likely Touch Points

### Server/API surface

- `src/app/api/customer/address/route.ts`
- `src/app/api/customer/_lib.ts`
- `src/app/api/external/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/auth/client/login/route.ts`
- `src/app/api/auth/client/register/route.ts`
- `src/app/api/profile/me/route.ts`
- `src/app/api/consumer/me/context/route.ts`

### Client state and auth/bootstrap

- `src/store.ts`
- `src/components/AuthBootstrap.tsx`
- `src/lib/supabase.ts`
- `src/lib/supabase-server.ts`

### Client data-loading and rendering

- `src/hooks/useRestaurants.ts`
- `src/components/HomePage.tsx`
- `src/features/home-discovery/hooks/useHomeRails.ts`
- `src/components/CartModal.tsx`

### App configuration

- `src/app/layout.tsx`
- `tsconfig.json`
- `next.config.js`

### Tests to add or expand

- `src/app/api/customer/address/route.test.ts`
- `src/app/api/external/route.test.ts`
- `src/app/api/orders/route.test.ts`
- `src/app/api/chat/route.test.ts`
- `src/store.test.ts`
- `src/hooks/useRestaurants.test.ts`
- `src/features/home-discovery/hooks/useHomeRails.test.ts`

Exact filenames may vary based on the existing test layout conventions in each folder.

## 5) Delivery Strategy

Implement this work in six phases, in order. Do not start the performance refactor before the access-control and proxy hardening phases are merged, because the security issues are higher risk and easier to isolate.

### Recommended merge order

1. Phase 1: Address ownership and customer identity hardening
2. Phase 2: Proxy elimination and request validation
3. Phase 3: Store/session persistence hardening
4. Phase 4: Request lifecycle reliability fixes
5. Phase 5: Home route decomposition and performance work
6. Phase 6: Config, type safety, and accessibility hardening

## 6) Phase 1 — Address Ownership and Customer Identity Hardening

### Problem

The customer address route currently reads and writes records based on a phone number provided by the caller. The supporting helper also searches customer rows in application code and can create customer records from free-form phone input. This is a broken access-control and privacy issue.

### Target Behavior

- Address reads and writes must be tied to the authenticated Supabase user.
- Customer identity resolution must use `auth_user_id` as the primary key path.
- Phone number may be used as profile data, but never as authorization proof.
- The API must fail closed if authentication or ownership cannot be verified.

### Target Architecture

Replace phone-based ownership with authenticated identity resolution:

1. Extract a shared authenticated-user resolver for API routes.
2. Resolve the logged-in auth user from bearer token or cookie-aware session.
3. Map auth user to customer record using `customers.auth_user_id`.
4. Read/write `customer_address` only through the resolved customer id.
5. Remove or isolate phone-based helper logic so it is not used by user-facing authenticated routes.

### Implementation Steps

#### Step 1.1 — Introduce shared auth resolution utility

- Create a small helper under `src/app/api/_lib` or similar that:
  - extracts bearer token safely
  - resolves Supabase user via `getSupabaseServer().auth.getUser(token)`
  - returns normalized user identity or an explicit `401`

#### Step 1.2 — Refactor customer ownership helpers

- Update `src/app/api/customer/_lib.ts` so it exposes an auth-user-based resolver:
  - `ensureCustomerByAuthUser(...)`
  - `findCustomerByAuthUser(...)` if needed
- Remove usage of `ensureCustomerByPhone(...)` from sensitive authenticated flows.
- Keep any phone-based helper only if there is a true guest flow that requires it, and isolate it behind explicit non-authenticated business rules.

#### Step 1.3 — Rewrite address route authorization

- Update `src/app/api/customer/address/route.ts`:
  - `GET` must require authenticated ownership
  - `POST` must require authenticated ownership
  - do not accept `phone` as the identity source
  - if guest checkout must remain supported, create a separate route with limited write scope and explicit anti-abuse controls instead of mixing guest and authenticated behavior

#### Step 1.4 — Align bootstrap and profile flows

- Update `src/components/AuthBootstrap.tsx` and any caller of `/api/customer/address` to use the authenticated route contract.
- Ensure address hydration happens through authenticated context and not through a phone lookup.

### Data and Migration Considerations

- Confirm the backend data model guarantees `customers.auth_user_id` uniqueness.
- If there are legacy customer rows without `auth_user_id`, define a one-time backfill or on-login reconciliation process.
- If guest carts must survive before login, keep guest address state local until the user authenticates, then attach it to the authenticated customer.

### Tests

- Unauthenticated `GET /api/customer/address` returns `401`.
- Unauthenticated `POST /api/customer/address` returns `401`.
- Authenticated user can read and update only their own address.
- No code path creates or resolves a customer from a free-form phone number in the authenticated route.
- Legacy missing-customer cases create a customer record linked to `auth_user_id`, not phone.

### Verification

- Manual API verification with valid and invalid bearer tokens.
- Confirm address records remain stable across refresh and logout/login.
- Confirm another user cannot read the same address by replaying a phone number.

### Risks

- Guest or pre-auth checkout flows may currently depend on phone-based address lookup.
- Existing data may contain customer rows not yet linked to `auth_user_id`.

## 7) Phase 2 — Proxy Elimination and Request Validation

### Problem

Several routes behave as generic forwarders to upstream services. The browser can currently influence environment selection, targets, and paths. This increases attack surface, complicates reasoning about authorization, and weakens failure handling.

### Target Behavior

- The browser should call explicit app-owned route handlers for specific actions.
- Route handlers should validate inputs and decide the upstream target internally.
- Test-only upstream selection must not be browser-controlled in production paths.
- Every route should have a narrow contract and explicit error mapping.

### Target Architecture

Move from generic proxying to task-specific route handlers:

1. Replace `external` and generic chat/order forwarding patterns with action-specific handlers.
2. Validate payloads using Zod schemas or equivalent typed parsing.
3. Centralize upstream request construction in server-only helper modules.
4. Restrict any test environment switching to server-side configuration or non-production guardrails.

### Implementation Steps

#### Step 2.1 — Freeze generic proxy expansion

- Mark these routes as deprecated implementation targets:
  - `src/app/api/external/route.ts`
  - `src/app/api/chat/route.ts`
- Do not build new features on top of them.

#### Step 2.2 — Introduce explicit server helpers

- Create server-only modules such as:
  - `src/app/api/_server/upstreams/n8n.ts`
  - `src/app/api/_server/upstreams/fast-eat.ts`
- These helpers should:
  - build base URLs from env
  - own timeouts and headers
  - normalize response parsing
  - map upstream errors to safe client-facing messages

#### Step 2.3 — Replace generic chat forwarding

- Update `src/app/api/chat/route.ts` so it only accepts the specific chat payload shape required by the app.
- Remove `isTest` from the client contract for production behavior.
- Validate required fields before sending upstream.

#### Step 2.4 — Narrow order creation route

- Update `src/app/api/orders/route.ts`:
  - accept only supported order-creation contracts
  - remove browser-controlled upstream selection
  - move branch-id normalization into validated server-side logic
  - reject malformed `tool` and `arguments` payloads

#### Step 2.5 — Replace or remove external route

- Audit all callers of `src/app/api/external/route.ts`.
- Replace them with dedicated routes for:
  - menu fetch
  - restaurant info fetch
  - any MCP or Fast Eat action currently using arbitrary `path`
- Remove the generic `path` parameter from browser-facing code.

#### Step 2.6 — Harden auth proxy routes

- Update `src/app/api/auth/client/login/route.ts` and `src/app/api/auth/client/register/route.ts`:
  - validate body shape before forwarding
  - enforce timeouts
  - return normalized safe error messages
  - optionally add rate limiting if this app serves public traffic directly

### Tests

- Invalid payloads return `400` with stable error bodies.
- Browser cannot select test-mode upstream in production order/chat flows.
- Arbitrary `path` forwarding is no longer possible.
- Auth proxy routes reject malformed payloads and time out safely.

### Verification

- Trace all current frontend callers and confirm no generic `target/path/isTest` contract remains in browser code.
- Confirm upstream errors are mapped to stable user-safe messages.

### Risks

- Some flows may depend on flexible path forwarding during development.
- Any hidden consumer of the generic proxy route must be found before removal.

## 8) Phase 3 — Store and Session Persistence Hardening

### Problem

The Zustand store persists private and operational data that should not survive logout or cross-account reuse on the same device.

### Target Behavior

- Auth state and private profile state should be separated from ephemeral operational state.
- Logout must clear all user-bound persisted data.
- Only intentionally durable preferences should remain persisted.

### Target Architecture

Split persisted state into explicit categories:

1. Durable preferences:
  - locale
  - non-sensitive UI preferences
2. Session-bound user state:
  - auth hydration flags
  - favorites/context snapshots
  - profile identifiers
3. Operational ephemeral state:
  - active orders
  - bid notifications
  - deep links
  - current cart/session data

Only category 1 should persist by default. Category 2 may persist selectively if required. Category 3 should not persist across logout.

### Implementation Steps

#### Step 3.1 — Audit persisted keys

- Review `partialize` in `src/store.ts`.
- Classify every persisted field as:
  - persist
  - clear on logout
  - never persist

#### Step 3.2 — Restructure the store

- Split store concerns into slices or grouped modules if practical:
  - auth/profile slice
  - cart/checkout slice
  - orders/notifications slice
  - preferences slice
- If slice refactor is too large for one PR, first reduce `partialize` scope and add explicit reset actions.

#### Step 3.3 — Fix logout behavior

- Ensure `clearAuthSession()` clears:
  - profile identity
  - address data
  - client context
  - active orders
  - bids and notifications
  - cart state if it is user-bound
- Add a single `resetForLogout()` action if needed.

#### Step 3.4 — Add persistence versioning

- Introduce a persistence version and migration strategy in the Zustand middleware.
- Use this to invalidate stale persisted structures safely when the store shape changes.

### Tests

- Logout clears all sensitive persisted data.
- Rehydration restores only approved keys.
- Switching accounts on the same device does not expose prior user data.
- Store version migration clears or maps old snapshots correctly.

### Verification

- Manual logout/login with two different test users in the same browser profile.
- Inspect localStorage persistence contents before and after logout.

### Risks

- Some product flows may currently rely on persisted cart or order state across restarts.
- Coordinate with product expectations before removing those behaviors.

## 9) Phase 4 — Request Lifecycle Reliability

### Problem

Some hooks create in-flight requests that cannot be cancelled correctly, allowing stale state updates and overlapping fetch cycles.

### Target Behavior

- All request-producing hooks must support cancellation on dependency change and unmount.
- Loading and error state must remain correct under rapid changes.
- Helper functions should not require consumers to manually await cleanup callbacks.

### Implementation Steps

#### Step 4.1 — Fix `useRestaurants`

- Refactor `src/hooks/useRestaurants.ts` so the abort controller lifecycle lives in the effect scope, not inside an async callback that returns cleanup later.
- Ensure the list fetch and suggestion fetch paths both support cancellation and stale-result suppression.

#### Step 4.2 — Audit similar hooks

- Review `useCategories`, `useAppData`, and other request hooks mentioned in earlier plans for the same anti-pattern.
- Standardize on one request lifecycle pattern.

#### Step 4.3 — Normalize timeout and abort behavior

- Introduce small fetch helpers if repeated timeout logic appears across route handlers and hooks.
- Prefer predictable `AbortError` handling and no state updates after abort.

### Tests

- Rapid dependency changes do not allow stale restaurant results to overwrite the latest fetch.
- Unmount aborts in-flight fetches.
- Suggestion requests cancel correctly when the query changes quickly.

### Verification

- Manual rapid filter/search changes in the home experience.
- Network panel confirms aborted rather than completed stale requests.

## 10) Phase 5 — Home Route Decomposition and Performance Refactor

### Problem

`HomePage` combines address recovery, search, personalization, filters, suggestions, analytics, and widget orchestration in one large client component. The rail builder also clones and sorts the restaurant list multiple times on each recomputation.

### Target Behavior

- Home route logic should be split by responsibility.
- Expensive list derivation should be measurable, localized, and easier to test.
- Non-critical widgets should remain lazy and not block the main route.

### Target Architecture

Break the home experience into three layers:

1. Page shell and route wiring
2. Home orchestration hooks
3. Presentational sections and rail components

Suggested extraction targets:

- `useHomeSearchState`
- `useHomeAddressRecovery`
- `useHomeSuggestions`
- `useHomeProfilePrompt`
- `HomeFiltersPanel`
- `HomeRecoveryState`
- `HomeRailsSection`

### Implementation Steps

#### Step 5.1 — Split `HomePage`

- Extract stateful concerns from `src/components/HomePage.tsx` into focused hooks.
- Keep the page component responsible for layout composition and top-level behavior wiring only.

#### Step 5.2 — Optimize rail derivation

- Refactor `src/features/home-discovery/hooks/useHomeRails.ts`:
  - avoid repeated full-array clones and sorts when intermediate results can be reused
  - memoize cheaper precomputed indexes if needed
  - keep personalized rail generation deterministic and testable

#### Step 5.3 — Review client/server boundaries

- Reassess whether some home data preparation can happen in server components or route loaders instead of inside a monolithic client tree.
- Keep interactive state client-side, but push pure data-fetch and static preparation server-side when feasible.

#### Step 5.4 — Review `CartModal`

- Reduce prop drilling where practical.
- Remove `alert(...)` fallback behavior and replace with app-consistent UI feedback.
- Avoid direct `useCartStore.getState()` reads in render-time flows when a selector-based subscription is clearer.

### Tests

- Existing home discovery tests remain green.
- Extracted hooks receive targeted unit tests.
- Rail ordering and filtering semantics remain unchanged.
- Search suggestion and recovery flows remain behaviorally correct.

### Verification

- Measure home route render cost before and after refactor.
- Confirm no regressions in suggestion timing, profile prompt behavior, and address recovery.

### Performance Metrics to Watch

- home route JS cost
- time to interactive on the home route
- suggestion response UX under rapid typing
- rerender frequency during filter and intent changes

## 11) Phase 6 — Config, Type Safety, and Accessibility Hardening

### Problem

The app currently hides Supabase misconfiguration with placeholders, runs with TypeScript strict mode disabled, and disables user zoom in the viewport config.

### Target Behavior

- Missing critical env vars fail fast in development and production build/start paths.
- Type safety increases in controlled increments.
- Mobile users can zoom again.

### Implementation Steps

#### Step 6.1 — Fail fast on Supabase env misconfiguration

- Update `src/lib/supabase.ts` to remove placeholder credentials.
- Throw a clear configuration error when required browser env vars are missing.
- Keep `src/lib/supabase-server.ts` as the server-side source for service-role access only.

#### Step 6.2 — Introduce stricter typing incrementally

- Change `tsconfig.json` toward strict mode in stages if needed:
  1. enable `noImplicitAny`
  2. enable `strictNullChecks`
  3. enable full `strict`
- Fix hotspots first in:
  - API route bodies
  - store payloads
  - home discovery hooks

#### Step 6.3 — Restore zoom accessibility

- Update `src/app/layout.tsx` viewport configuration:
  - remove `maximumScale: 1`
  - remove `userScalable: false`

#### Step 6.4 — Optional config hardening

- Consider adding additional response headers and route-level hardening as a separate follow-up if this app is directly exposed.
- Evaluate CSP and security header strategy once proxy cleanup is complete.

### Tests

- Build fails clearly when required env vars are missing.
- Typecheck passes under the selected strictness phase.
- Viewport changes do not regress layout.

### Verification

- Manual mobile browser zoom check.
- Fresh startup with missing env vars yields actionable failure.

## 12) Cross-Cutting Testing Plan

### Unit and integration priorities

1. Address ownership route tests
2. Proxy route contract tests
3. Store persistence and logout tests
4. `useRestaurants` cancellation tests
5. `useHomeRails` behavior tests

### End-to-end scenarios to validate

1. Login as user A, save address, logout, login as user B, verify no state leakage.
2. Open home, change filters quickly, confirm no stale restaurant flashes.
3. Create order through the app and confirm no browser-controlled test routing remains.
4. Trigger invalid payloads to order/chat/auth routes and confirm safe `400` responses.

## 13) Rollout and PR Plan

### PR 1 — Access control and address ownership

- Phase 1 only
- Must ship with tests

### PR 2 — Proxy hardening

- Phase 2 only
- Prefer route-by-route replacement over one large rewrite

### PR 3 — Store/session cleanup

- Phase 3
- Include persistence migration notes in PR description

### PR 4 — Request lifecycle fixes

- Phase 4
- Small and easy to validate independently

### PR 5 — Home route refactor

- Phase 5
- Protect with targeted tests and before/after perf notes

### PR 6 — Config, typing, accessibility

- Phase 6
- Can be split further if strict-mode migration is noisy

## 14) Non-Goals for This Plan

These items are intentionally out of scope unless new findings require them:

- redesigning the product UX beyond what is needed for behavioral consistency
- backend schema redesign unrelated to the verified findings
- introducing a new global state library
- large-scale visual restyling unrelated to accessibility or performance

## 15) Definition of Done

This plan is complete when:

- all six phases are implemented or formally waived
- all affected routes have tests for happy path and failure path
- private user data does not leak across logout/login boundaries
- no browser-facing route allows arbitrary upstream path or environment switching
- home route behavior is preserved with reduced client complexity
- the app fails fast on missing Supabase env vars
- zoom accessibility is restored

## 16) Recommended Immediate Start

Start with Phase 1 and Phase 2. They deliver the highest risk reduction with the clearest contracts and the least ambiguity:

1. lock customer address access to authenticated ownership
2. remove browser-controlled proxy routing contracts
3. only then clean up persistence and performance with a safer base