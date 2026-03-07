# Fast Eat Client Next.js-Only Backend Runtime Plan

Last updated: 2026-03-07
Owner: Frontend / Client Platform
Status: Implemented
Scope: Implemented in fast-eat-client. Final verification and rollout validation remain.

## Implementation Status

The migration described in this document has been implemented in `fast-eat-client`.

Current repository status:

- browser requests stay inside `fast-eat-client` Next.js routes
- runtime `FAST_EAT_API_URL` dependencies were removed from `src`
- `fetchFastEat` and the Fast Eat upstream helper were removed from runtime code
- user-facing API routes now resolve through local Next.js server modules and direct Supabase or approved external integrations
- NestJS remains untouched and available for future reuse or rollback

What still remains outside the migration itself:

- end-to-end flow verification in the running app
- optional environment cleanup in developer-local files
- optional post-migration documentation cleanup

## 1) Objective

Make the entire `fast-eat-client` application use only the Next.js backend layer at runtime.

This means:

- the browser continues calling only `fast-eat-client` routes under `src/app/api`
- those Next.js routes stop depending on `FAST_EAT_API_URL` and `fetchFastEat`
- the NestJS API remains alive and untouched for future reuse or rollback
- all app-critical backend behavior needed by `fast-eat-client` is hosted inside the Next.js server runtime

This plan does not remove `fast-eat-api-nestjs`. It only removes the runtime dependency from `fast-eat-client`.

## 2) Business Context

The immediate business goal is speed and delivery simplicity for the first client.

The architecture we want short-term is:

1. browser
2. Next.js app routes in `fast-eat-client`
3. Supabase and external services from server-side Next.js code

The architecture we explicitly want to preserve as an option is:

1. the ability to move some or all backend logic back to `fast-eat-api-nestjs` later
2. keeping NestJS available as a future orchestration, service, or multi-client backend

Because of that, this plan is designed for reversibility and parity, not a destructive migration.

## 3) Current Architecture Summary

Today `fast-eat-client` uses a mixed backend model.

### 3.1 Backend modes currently in use

1. Next.js-only routes that query Supabase or internal services directly.
2. Next.js routes that proxy to NestJS via `fetchFastEat`.
3. Hybrid routes that try NestJS first and fall back to local Next.js or Supabase logic.

### 3.2 Current central proxy dependency

The runtime dependency on NestJS is centered around:

- `src/app/api/_server/upstreams/fast-eat.ts`

That file resolves `FAST_EAT_API_URL` and sends server-side HTTP requests from Next.js to the NestJS backend.

### 3.3 Why this matters

The current design adds latency and complexity on important user paths when a request becomes:

1. browser -> Next.js
2. Next.js -> NestJS
3. NestJS -> Supabase or downstream logic

This is tolerable when the NestJS backend is providing unique business orchestration. It is a poor tradeoff when the client only needs read-heavy, route-local data that could be served directly inside Next.js.

## 4) Migration Target Architecture

The target architecture for `fast-eat-client` is:

1. browser calls only Next.js app routes
2. Next.js app routes call shared internal server modules
3. shared internal server modules call Supabase and approved external services directly
4. no `fetchFastEat` calls are on the runtime critical path

### 4.1 Required internal backend layer inside fast-eat-client

The Next.js app needs a real server-side application layer, not just route handlers with inline queries.

Recommended internal structure:

- `src/server/auth`
- `src/server/customers`
- `src/server/discovery`
- `src/server/restaurants`
- `src/server/menu`
- `src/server/carts`
- `src/server/checkout`
- `src/server/orders`
- `src/server/reviews`
- `src/server/social`
- `src/server/promotions`
- `src/server/loyalty`
- `src/server/db`

### 4.2 Design rules

1. Route handlers stay thin.
2. Shared business rules live in server modules.
3. Response mapping is centralized.
4. Auth and customer resolution are not duplicated across routes.
5. Existing payload shapes are preserved where possible.

## 5) Non-Goals

This plan does not include:

1. modifying `fast-eat-api-nestjs`
2. removing the NestJS repo
3. changing the browser to call Supabase directly for sensitive flows
4. redesigning product behavior unrelated to the backend runtime move
5. changing the rollout strategy for future backend reuse

## 6) Success Criteria

This project is successful when all of the following are true:

1. `fast-eat-client` runtime does not require `FAST_EAT_API_URL`
2. `fetchFastEat` is removed from all user-facing runtime routes
3. critical app flows continue to work through Next.js-only API handlers
4. route latency improves or at minimum does not regress on critical paths
5. NestJS remains deployable and available for future return migration
6. migration is reversible because response contracts remain controlled and documented

## 7) Route Inventory And Migration Scope

This section groups the known `src/app/api` surface by migration type.

### 7.1 Already Next.js-native or primarily local

These routes are already aligned with the target architecture and should mostly be left alone except for normalization and shared-module extraction.

- `src/app/api/categories/route.ts`
- `src/app/api/favorites/route.ts`
- `src/app/api/profile/me/route.ts`
- `src/app/api/profile/dietary/route.ts`
- `src/app/api/profile/dietary/options/route.ts`
- `src/app/api/customer/address/route.ts`
- `src/app/api/customer/profile/route.ts`
- `src/app/api/restaurants/route.ts`
- `src/app/api/restaurants/[restaurantId]/reviews/route.ts`
- `src/app/api/reviews/restaurant/route.ts`
- `src/app/api/reviews/delivery/route.ts`
- `src/app/api/reviews/eligibility/route.ts`
- `src/app/api/branches/[branchId]/reviews/route.ts`
- `src/app/api/tables/route.ts`
- `src/app/api/search/recent/route.ts`
- `src/app/api/maps/route.ts`
- `src/app/api/discovery/_lib.ts`
- large parts of the discovery routes if they already only use local server utilities

### 7.2 Confirmed proxy or hybrid migration targets

These are the main routes that must be migrated off NestJS runtime dependencies.

- `src/app/api/auth/client/bootstrap/route.ts`
- `src/app/api/auth/client/login/route.ts`
- `src/app/api/auth/client/register/route.ts`
- `src/app/api/consumer/me/bootstrap/route.ts`
- `src/app/api/consumer/me/context/route.ts`
- `src/app/api/consumer/me/loyalty/route.ts`
- `src/app/api/consumer/promotions/active/route.ts`
- `src/app/api/consumer/content/stories/route.ts`
- `src/app/api/carts/route.ts`
- `src/app/api/carts/[cartId]/route.ts`
- `src/app/api/branches/[branchId]/shell/route.ts`
- `src/app/api/branches/[branchId]/checkout-context/route.ts`
- `src/app/api/menu/branch/[branchId]/categories/route.ts`
- `src/app/api/menu/branch/[branchId]/items/route.ts`
- likely portions of `src/app/api/menu/branch/[branchId]/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/history/route.ts`
- `src/app/api/orders/[orderId]/route.ts`
- `src/app/api/orders/[orderId]/tracking/route.ts`
- `src/app/api/orders/[orderId]/confirm-delivery/route.ts`
- `src/app/api/orders/[orderId]/splits/route.ts`
- `src/app/api/orders/[orderId]/splits/latest/route.ts`
- `src/app/api/orders/[orderId]/bids/route.ts`
- `src/app/api/orders/[orderId]/bids/[bidId]/accept/route.ts`
- `src/app/api/orders/[orderId]/bids/[bidId]/counter/route.ts`
- `src/app/api/planner/recommendations/route.ts`
- `src/app/api/mystery-box/offers/route.ts`
- `src/app/api/mystery-box/offers/[offerId]/accept/route.ts`

### 7.3 Special-case external or non-Nest upstreams

These are not part of the NestJS removal scope but still need review for coherence.

- `src/app/api/chat/route.ts`
- `src/app/api/external/route.ts`
- `src/app/api/_server/upstreams/n8n.ts`
- any discovery assistant endpoints relying on external AI or workflow services

## 8) Domain-Level Migration Plan

The migration should happen by domain, in the order below.

## Phase 1 — Inventory, contract freeze, and server foundation

### Goal

Create the shared Next.js server layer and freeze the contracts that must remain stable during the migration.

### Work

1. Build a route matrix for all routes listed above.
2. For each proxied route, document:
   - current Next path
   - current upstream Nest path
   - auth requirement
   - consumer components and hooks
   - tables touched
   - mutation risk level
3. Create shared server module locations.
4. Add internal utilities for:
   - server Supabase client access
   - admin client access
   - auth token parsing and auth user resolution
   - customer resolution from auth user
   - consistent JSON response and error helpers
5. Keep `fetchFastEat` in place only as compatibility while domains are migrated.

### Files likely affected later

- `src/app/api/_server/upstreams/fast-eat.ts`
- `src/app/api/_lib/auth.ts`
- `src/app/api/customer/_lib.ts`
- new `src/server/**` modules

### Verification

1. No behavior changes yet.
2. Shared server modules compile cleanly.
3. No route has been migrated yet, but the migration scaffolding is in place.

## Phase 2 — Auth, bootstrap, and customer identity

### Goal

Remove NestJS dependency from all auth-adjacent and bootstrap-critical flows.

### Why this phase comes first

Root bootstrap and protected-route identity are central to the app. Until these are Next.js-native, every authenticated route keeps carrying a cross-backend dependency.

### Routes in scope

- `src/app/api/auth/client/bootstrap/route.ts`
- `src/app/api/auth/client/login/route.ts`
- `src/app/api/auth/client/register/route.ts`
- `src/app/api/consumer/me/bootstrap/route.ts`
- `src/app/api/consumer/me/context/route.ts`

### Work

1. Port customer bootstrap logic into shared Next.js server modules.
2. Port any customer provisioning behavior currently hidden in NestJS auth flows.
3. Rebuild minimal bootstrap contract fully in Next.js.
4. Rebuild richer consumer context contract fully in Next.js.
5. Align profile, address, favorites, recent searches, and settings assembly with existing consumer expectations.
6. Keep root bootstrap lightweight per the earlier performance plan.

### Key server modules to introduce

- `src/server/auth/session.ts`
- `src/server/customers/resolve-customer.ts`
- `src/server/customers/bootstrap.ts`
- `src/server/customers/context.ts`

### Risks

1. Hidden side effects in current NestJS bootstrap logic.
2. Differences between auth registration and customer creation semantics.
3. Breaking protected-route redirects or profile hydration.

### Verification

1. Sign-in and sign-up continue to work.
2. Protected routes still redirect correctly.
3. Auth bootstrap no longer calls NestJS.
4. Root app shell hydrates correctly without `FAST_EAT_API_URL`.

## Phase 3 — Restaurant shell and branch public context

### Goal

Move restaurant shell and branch-level public context entirely into Next.js.

### Why this matters

The restaurant route is one of the hottest paths in the app and a major source of perceived slowness.

### Routes in scope

- `src/app/api/restaurants/public/branch/[branchId]/route.ts`
- `src/app/api/branches/[branchId]/shell/route.ts`
- `src/app/api/branches/[branchId]/checkout-context/route.ts`
- `src/app/api/checkout/pricing/route.ts`
- branch-related read utilities used by menu and checkout

### Work

1. Create a branch shell assembler in Next.js.
2. Standardize branch-first field precedence:
   - rating
   - review count
   - address
   - maps URL
   - availability
   - payment methods
   - service modes
3. Rebuild checkout-context directly in Next.js.
4. Centralize fee-rule resolution in shared checkout modules.
5. Eliminate proxy-first-plus-fallback behavior in favor of one real source of truth.

### Key server modules to introduce

- `src/server/restaurants/branch-shell.ts`
- `src/server/restaurants/public-branch.ts`
- `src/server/checkout/context.ts`
- `src/server/checkout/pricing.ts`

### Risks

1. Branch vs restaurant data precedence bugs.
2. Inconsistent table or fee data if logic is duplicated.
3. Unclear ownership of branch metrics like rating and review count.

### Verification

1. Restaurant route renders using only Next.js backend routes.
2. Checkout page still receives correct fee rates and restaurant context.
3. Branch rating, review count, and public info remain correct.

## Phase 4 — Progressive menu loading and menu assembly

### Goal

Retain the progressive menu loading architecture while replacing all NestJS runtime dependence behind it.

### Routes in scope

- `src/app/api/menu/branch/[branchId]/route.ts`
- `src/app/api/menu/branch/[branchId]/categories/route.ts`
- `src/app/api/menu/branch/[branchId]/items/route.ts`

### Work

1. Build category-index queries in Next.js server modules.
2. Build category-scoped menu item loaders.
3. Centralize:
   - variant loading
   - modifier group loading
   - ingredient loading
   - channel-aware price resolution
   - default variant resolution
4. Preserve the payload shape already used by `useAppData`.
5. Keep full-menu fallback only if necessary during migration, then remove it.

### Key server modules to introduce

- `src/server/menu/categories.ts`
- `src/server/menu/items.ts`
- `src/server/menu/pricing.ts`
- `src/server/menu/mappers.ts`

### Risks

1. Menu query performance regressions.
2. Variant and modifier parity bugs.
3. Price channel differences between current NestJS behavior and Next.js reimplementation.

### Verification

1. Restaurant menu critical path no longer uses NestJS.
2. Categories-first and progressive item loading still work.
3. Cart item restoration still matches menu item structures.

## Phase 5 — Carts and saved cart persistence

### Goal

Move all cart CRUD and saved cart behavior into Next.js.

### Routes in scope

- `src/app/api/carts/route.ts`
- `src/app/api/carts/[cartId]/route.ts`

### Work

1. Port saved cart persistence and listing logic into Next.js server modules.
2. Centralize cart ownership and customer-bound access control.
3. Preserve current cart payload shape for the client store and UI.
4. Port any cart item validation currently enforced by NestJS.
5. Keep branch scoping and branch-switch semantics consistent.

### Key server modules to introduce

- `src/server/carts/repository.ts`
- `src/server/carts/service.ts`
- `src/server/carts/validators.ts`

### Risks

1. Cart restoration regressions.
2. Data corruption or duplication when users switch branches.
3. Saved cart permissions bugs.

### Verification

1. Carts page works without NestJS.
2. Saved carts load and update correctly.
3. Root bootstrap remains light and carts are route-hydrated only when needed.

## Phase 6 — Orders, tracking, bids, and payment-adjacent flows

### Goal

Migrate the highest-risk mutation domain after the read paths and simpler state domains are stable.

### Routes in scope

- `src/app/api/orders/route.ts`
- `src/app/api/orders/history/route.ts`
- `src/app/api/orders/[orderId]/route.ts`
- `src/app/api/orders/[orderId]/tracking/route.ts`
- `src/app/api/orders/[orderId]/confirm-delivery/route.ts`
- `src/app/api/orders/[orderId]/splits/route.ts`
- `src/app/api/orders/[orderId]/splits/latest/route.ts`
- `src/app/api/orders/[orderId]/bids/route.ts`
- `src/app/api/orders/[orderId]/bids/[bidId]/accept/route.ts`
- `src/app/api/orders/[orderId]/bids/[bidId]/counter/route.ts`

### Work

1. Port order creation and validation rules to Next.js.
2. Port order history and tracking read models.
3. Port bid retrieval and bid acceptance/counter-offer flows.
4. Port split storage and retrieval flows.
5. Preserve all frontend-facing status codes and payload fields used by tracking and notifications UI.

### Key server modules to introduce

- `src/server/orders/create-order.ts`
- `src/server/orders/history.ts`
- `src/server/orders/tracking.ts`
- `src/server/orders/bids.ts`
- `src/server/orders/splits.ts`

### Risks

1. This is the highest-risk domain in the app.
2. Hidden orchestration behavior may currently exist in NestJS.
3. Delivery auction and status flows may depend on non-obvious side effects.

### Verification

1. Order placement works end-to-end.
2. Tracking UI continues to receive expected payloads.
3. Bid flows remain correct.
4. Order history stays aligned with user expectations.

## Phase 7 — Secondary domains and feature endpoints

### Goal

Remove residual NestJS dependencies from non-core but still user-visible domains.

### Routes in scope

- `src/app/api/consumer/me/loyalty/route.ts`
- `src/app/api/consumer/promotions/active/route.ts`
- `src/app/api/consumer/content/stories/route.ts`
- `src/app/api/planner/recommendations/route.ts`
- `src/app/api/mystery-box/offers/route.ts`
- `src/app/api/mystery-box/offers/[offerId]/accept/route.ts`
- any remaining discovery assistant routes still proxying upstream

### Work

1. Audit whether each endpoint should truly become local or remain backed by another external service.
2. Port simple read models into Next.js.
3. For feature logic tied to external systems, keep the external integration but remove NestJS as the middle layer where possible.

### Risks

1. These features may be lower priority for the first client and should not delay core flow migration.
2. Some may depend on service logic better left external.

### Verification

1. No residual user-facing route depends on NestJS unless deliberately deferred.

## Phase 8 — Cleanup, deactivation, and rollback readiness

### Goal

Finish the migration cleanly without destroying the ability to return to NestJS later.

### Work

1. Remove runtime `fetchFastEat` usage from all migrated routes.
2. Remove `FAST_EAT_API_URL` from `fast-eat-client` runtime requirements.
3. Keep contract notes documenting how each route maps back to NestJS if future re-migration is desired.
4. Optionally keep a non-runtime compatibility adapter or migration notes for each domain.

### Verification

1. Search for remaining `fetchFastEat` usage in runtime routes and reduce it to zero or an explicitly accepted exception list.
2. Confirm the app runs with no `FAST_EAT_API_URL` configured.
3. Confirm all critical user flows still work.

## 9) Cross-Cutting Technical Requirements

### 9.1 Auth and customer resolution

Every migrated route must stop re-implementing auth resolution independently.

Required shared capabilities:

1. resolve bearer token
2. resolve Supabase auth user
3. resolve or create customer record when required
4. enforce route-specific authorization

### 9.2 Shared response mapping

Many routes currently perform ad hoc mapping. That should be replaced with shared mappers for:

1. branch shell
2. restaurant public payloads
3. menu items
4. checkout context
5. order status payloads
6. favorites and review summaries

### 9.3 Shared error semantics

The migration should preserve current frontend expectations for:

1. `401` vs `403`
2. field validation errors
3. missing branch or restaurant behavior
4. empty states vs error states

### 9.4 Performance rules

As logic moves into Next.js:

1. avoid route-local N+1 Supabase queries
2. reuse shared loaders for repeated joins
3. keep branch shell and menu routes optimized for critical render paths
4. preserve progressive loading benefits already implemented

## 10) Verification And Rollout Plan

Each phase should be verified independently.

### 10.1 Static verification

1. build passes
2. lint passes or only known baseline warnings remain
3. touched routes have no editor errors

### 10.2 Behavioral verification

For each migrated domain:

1. verify payload parity with previous route behavior
2. verify auth behavior and protected-route expectations
3. verify empty, loading, and error states

### 10.3 Browser verification

For migrated domains, validate at minimum:

1. app boot to home
2. home to restaurant
3. restaurant to reviews
4. restaurant to checkout
5. carts flow
6. order history/tracking flow

### 10.4 Rollback discipline

1. Migrate by domain.
2. Keep each phase reversible.
3. Do not delete compatibility code until the replacement has been verified.

## 11) Risks And Constraints

### 11.1 Highest-risk areas

1. auth bootstrap
2. carts persistence
3. order creation
4. bid workflows
5. tracking and delivery confirmation

### 11.2 Medium-risk areas

1. checkout context and pricing
2. progressive menu assembly
3. consumer context hydration

### 11.3 Lower-risk areas

1. categories
2. favorites
3. review reads
4. branch public info if branch shell is already migrated correctly

### 11.4 Constraint to preserve

The NestJS API must remain intact and reusable. This migration must not assume it is being deleted or rewritten.

## 12) Recommended Execution Order

1. Inventory and shared server foundation
2. Auth/bootstrap/customer identity
3. Restaurant shell and branch public context
4. Progressive menu loading
5. Carts and saved cart persistence
6. Checkout pricing and context alignment
7. Orders, bids, tracking, and splits
8. Secondary domains
9. Cleanup and removal of runtime NestJS dependency

## 13) Done When

The migration is complete when:

1. `fast-eat-client` no longer needs `FAST_EAT_API_URL` for runtime requests
2. no user-facing route depends on `fetchFastEat`
3. critical customer flows are Next.js-only on the backend path
4. the first-client deployment can run with a single backend runtime in `fast-eat-client`
5. NestJS still exists as a future migration-back option rather than a current runtime dependency

## 14) Completion Notes

As of 2026-03-07, the codebase satisfies the implementation-side completion criteria above.

Observed repository state:

1. `fast-eat-client/src` no longer contains runtime references to `FAST_EAT_API_URL`
2. `fetchFastEat` and the NestJS upstream helper are no longer present in runtime code
3. the migrated app route surface is backed by local Next.js server modules
4. home, restaurant, menu, carts, tracking, planner, loyalty, promotions, mystery-box, and auth-adjacent routes are served by the Next.js runtime layer

Operational close-out still recommended:

1. complete browser verification for critical user flows
2. keep `.env.local` cleanup as a manual developer choice because it may contain user-specific secrets
3. keep NestJS deployed only if rollback readiness is still required
