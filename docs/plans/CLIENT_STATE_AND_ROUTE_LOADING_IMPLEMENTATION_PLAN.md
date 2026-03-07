# Fast Eat Client State, Props, And Route Loading Implementation Plan

Last updated: 2026-03-06
Owner: Frontend
Status: Proposed
Scope: Planning only. No code changes.

## 1) Objective

Reduce unnecessary data loading, broad rerenders, and slow route transitions in `fast-eat-client`, with the highest priority on:

- faster restaurant menu entry
- fewer unnecessary authenticated bootstrap requests
- better state ownership and less prop churn
- data reuse between related routes
- progressive loading of restaurant content
- clearer separation between critical and non-critical UI work

This plan is based on a read-only audit of the current code and live browser request traces.

## 2) Primary Problems Confirmed

### 2.1 Root bootstrap loads too much on every authenticated route

`src/components/AuthBootstrap.tsx` currently hydrates profile, consumer context, and saved carts in parallel from the root layout.

Confirmed effects:

- opening home triggers auth bootstrap requests plus page-specific requests
- opening reviews triggers reviews requests plus the same auth bootstrap requests
- restaurant entry triggers repeated auth bootstrap traffic during the same session

This makes route-specific pages pay for global data that they do not always need.

### 2.2 Restaurant menu waits for too much before becoming useful

`src/hooks/useAppData.ts` still treats the menu as a single large critical path.

Current loading order:

1. restaurant info and table quantity
2. full menu payload
3. background cart sync

Even with the current parallelization of restaurant info and table quantity, the menu screen still waits for the full menu dataset before rendering meaningful category content.

### 2.3 Checkout refetches data the restaurant page already knows

`src/components/CheckoutPageContent.tsx` reloads restaurant info, table quantity, and fee rates instead of reusing route-adjacent state.

This slows the restaurant to checkout transition and creates redundant network traffic.

### 2.4 MainApp owns too much state and too much rendering work

`src/components/MainApp.tsx` is responsible for:

- branch resolution
- route session synchronization
- restaurant shell state
- menu rendering
- category navigation
- cart interactions
- order location handling
- modal orchestration
- chat widget mount
- order tracking modal mount

This produces a large rerender surface and makes it difficult to isolate critical rendering from secondary UI.

### 2.5 Route data loading is inconsistent across the app

The app currently mixes:

- root bootstrap fetches
- page-local `useEffect` fetches
- manual module caches
- Zustand persistence
- ad hoc browser-side deduping

This makes cache reuse, stale policy, and route-to-route data sharing inconsistent.

## 3) Audit Summary By Route Transition

### 3.1 App boot to home

Observed current load:

- authenticated bootstrap requests
- categories request
- restaurants request
- customer address recovery request for authenticated users without hydrated address state

Problems:

- too much non-critical authenticated state is loaded immediately
- home route performs several unrelated responsibilities during first paint

### 3.2 Home to restaurant menu

Observed current load:

- authenticated bootstrap requests
- branch session synchronization
- restaurant public info
- table availability
- full menu payload
- favorites request
- chat widget chunk and tracking modal chunk during menu session

Problems:

- menu first render is bound to a full menu payload
- restaurant page still pulls non-critical UI and state too early
- route entry does not progressively reveal categories and initial items

### 3.3 Restaurant menu to reviews

Observed current load:

- branch reviews request
- authenticated bootstrap requests again

Problems:

- reviews route itself is lightweight
- root bootstrap is what makes the transition feel heavier than necessary

### 3.4 Restaurant menu to checkout

Observed current load:

- checkout-specific reload of restaurant info
- checkout-specific reload of table quantity
- checkout-specific reload of fee rates

Problems:

- duplicated branch context
- duplicated restaurant context
- no route cache reuse

### 3.5 Home and search suggestion flows

Observed current load:

- restaurants list for the home page
- separate suggestion fetches on query
- categories fetch using short-lived module cache

Problems:

- multiple independent fetch paths around the same restaurant discovery data
- limited cache persistence for slow-changing data such as categories

## 4) Target Frontend Architecture

The frontend should move to a route-aware server-state model with progressive rendering.

### 4.1 Root layout responsibilities

Keep at the root only what is truly global and cheap:

- auth session presence
- locale and i18n
- service worker registration
- route transition indicator

Move out of root bootstrap:

- saved carts hydration
- rich consumer context
- customer address fetch
- other route-specific authenticated data

### 4.2 Restaurant route responsibilities

The restaurant route should load in layers:

1. branch resolution and restaurant shell
2. category index
3. first visible category items or first content chunk
4. deferred remaining category chunks
5. deferred favorites, reviews preview, chat, tracking, and secondary enhancements

### 4.3 Checkout responsibilities

Checkout should reuse already-known branch and restaurant context when entered from a restaurant route, and only refetch when data is stale or missing.

### 4.4 State ownership rules

Use these placement rules consistently:

- local UI state stays local
- route-specific server state lives in a query cache
- cross-route user session state lives in Zustand only when it must persist across navigation
- derived values should be computed, not stored
- components should subscribe to small store slices instead of broad objects

## 5) Implementation Phases

## Phase 1 — Split root bootstrap into minimal auth bootstrap and lazy route hydration

### Goal

Stop every route from paying for full consumer context and carts hydration.

### Work

1. Refactor `src/components/AuthBootstrap.tsx` into a minimal root-level auth/session hydrator.
2. Keep only user identity, auth state, and redirect protection in the root path.
3. Move `/api/carts` hydration to the carts route and other explicit entry points that actually need it.
4. Move `/api/consumer/me/context` hydration behind route-aware hooks used by profile, checkout, or other routes that actually consume it.
5. Keep `profile/me` out of the critical path unless a route specifically depends on profile completion or address state.

### Likely files

- `src/components/AuthBootstrap.tsx`
- `src/store.ts`
- `src/features/home-discovery/hooks/useHomeAddressRecovery.ts`
- `src/app/carts/page.tsx`
- `src/components/CartsPageContent.tsx`
- `src/app/profile/page.tsx`
- `src/app/checkout/page.tsx`

### Verification

- home load should no longer trigger carts and rich consumer context by default
- reviews load should trigger only reviews plus minimal auth requirements
- protected routes should still redirect correctly

## Phase 2 — Introduce shared route-query caching for restaurant, checkout, reviews, and home discovery

### Goal

Unify route data fetching so duplicate requests are deduped and data can be reused across transitions.

### Work

1. Introduce TanStack Query for route data or a thin equivalent if the team wants a smaller migration.
2. Define stable query keys for:
   - auth bootstrap
   - restaurant shell
   - restaurant categories
   - menu items by category or page chunk
   - checkout context
   - branch reviews
   - favorites by restaurant
   - categories index
   - restaurant discovery list
3. Set explicit `staleTime` values per data type.
4. Remove duplicated `useEffect` fetches where the same data becomes query-backed.

### Likely files

- `src/hooks/useAppData.ts`
- `src/components/CheckoutPageContent.tsx`
- `src/components/RestaurantReviewsSection.tsx`
- `src/hooks/useCategories.ts`
- `src/hooks/useRestaurants.ts`
- `src/services/api.ts`
- provider setup file to add query client support

### Verification

- re-entering restaurant, checkout, or reviews should reuse cached data when fresh
- duplicate fetches should be visibly reduced in browser network traces

## Phase 3 — Convert restaurant menu loading to progressive rendering

### Goal

Make restaurant entry feel fast by rendering categories and first content before the full menu dataset arrives.

### Work

1. Split current menu loading into:
   - restaurant shell query
   - categories query
   - first category items query
   - deferred remaining category items queries
2. Render category navigation as soon as the category list exists.
3. Render the first category section immediately.
4. Load remaining categories in background or on interaction.
5. Add skeletons per category section instead of one full-screen menu wait.
6. Prefer idle-time or near-scroll prefetch for the next category.

### Client-side fallback if API does not change immediately

If the backend cannot split menu payloads right away, implement a transitional client strategy:

- request the current full menu payload once
- derive categories immediately
- render the first category first
- defer mounting of non-visible sections with chunked rendering

This still improves perceived speed, though it will not reduce network payload size.

### Likely files

- `src/hooks/useAppData.ts`
- `src/components/MainApp.tsx`
- `src/components/MenuSkeleton.tsx`
- `src/components/CategoryBar.tsx`
- new hooks such as `useRestaurantShell`, `useRestaurantCategories`, and `useCategoryItems`

### Verification

- restaurant shell should appear before all items are ready
- categories should appear before full menu completion
- first visible category should be usable sooner than today

## Phase 4 — Decompose MainApp and reduce rerender spread

### Goal

Shrink the menu page’s rerender surface and separate critical content from secondary overlays and tools.

### Work

1. Split `MainApp` into focused components:
   - branch session resolver
   - restaurant shell view
   - category navigation controller
   - visible menu list
   - cart launcher and checkout launcher
   - chat and order tracking launchers
2. Replace broad `useCartStore()` reads with granular selectors.
3. Avoid passing broad mutable objects through long prop chains where only a few fields are needed.
4. Keep modal state near modal triggers instead of centralizing everything in one parent where practical.
5. Remove always-mounted secondary components when they can be interaction-mounted.

### Likely files

- `src/components/MainApp.tsx`
- `src/store.ts`
- `src/components/Navbar.tsx`
- `src/components/CartModal.tsx`
- `src/components/ItemDetailModal.tsx`
- `src/components/OrderTrackingModal.tsx`
- `src/components/ChatWidget.tsx`

### Verification

- changing cart quantity should not cause unrelated menu shell work to rerender broadly
- restaurant menu should remain responsive while cart and tracking state update

## Phase 5 — Reuse restaurant data on checkout and tighten cross-route prefetch

### Goal

Remove duplicate route fetches and make common transitions cheaper.

### Work

1. Replace checkout boot fetches with reuse of cached restaurant shell and checkout context.
2. Prefetch checkout context after the menu shell stabilizes or when the cart becomes non-empty.
3. Prefetch branch reviews summary only when the user nears the reviews control or opens the reviews page.
4. Consider intent-based prefetch on restaurant cards from home and search.

### Likely files

- `src/components/CheckoutPageContent.tsx`
- `src/components/RestaurantCard.tsx`
- `src/components/Navbar.tsx`
- `src/components/RestaurantReviewsSection.tsx`

### Verification

- restaurant to checkout should not refetch restaurant and table data when fresh
- opening reviews from a restaurant should load only review data and minimal shared state

## Phase 6 — Optimize home, categories, suggestions, and non-critical widgets

### Goal

Reduce home-route work and prevent it from becoming the bottleneck before restaurant entry.

### Work

1. Replace short-lived module category cache with query-backed or persistent cache.
2. Reuse restaurant list results for suggestions when possible.
3. Delay non-critical discovery widgets until after the main search and restaurant rails are interactive.
4. Keep address recovery from running in the critical path when not strictly required.
5. Audit dynamic imports to ensure they are not mounted early unless needed.

### Likely files

- `src/components/HomePage.tsx`
- `src/hooks/useCategories.ts`
- `src/hooks/useRestaurants.ts`
- `src/features/home-discovery/hooks/useHomeRails.ts`
- `src/features/home-discovery/hooks/useHomeAddressRecovery.ts`

### Verification

- home should show core search and discovery faster
- categories and restaurants should avoid duplicate fetch paths

## Phase 7 — Verification, profiling, and rollout discipline

### Goal

Make the performance work measurable and safe.

### Work

1. Record baseline route traces before implementation.
2. Re-check these transitions after each phase:
   - app boot to home
   - home to restaurant
   - restaurant to reviews
   - restaurant to checkout
   - home to carts
3. Add targeted tests around new data hooks and route caching behavior.
4. Validate visual behavior with browser tools after each UI-facing phase.

### Verification metrics

- fewer bootstrap requests on home and reviews
- fewer duplicate requests on restaurant and checkout
- faster first useful paint on restaurant entry
- fewer rerenders on cart edits

## 6) State Management Refactor Guidelines

### 6.1 What should remain in Zustand

- auth session identity
- persisted cart contents when required for offline continuity
- checkout draft if cross-route persistence is required
- minimal user-level preferences that must survive refresh

### 6.2 What should move out of broad persisted store ownership

- route-local fetch status
- restaurant route shell loading state
- reviews loading state
- favorites loading state
- transient modal and animation state

### 6.3 Selector rules

Use selector-based reads for all large components. Avoid broad object destructuring from `useCartStore()` inside large route containers.

## 7) Files Expected To Change

### High-priority frontend files

- `src/components/AuthBootstrap.tsx`
- `src/hooks/useAppData.ts`
- `src/components/MainApp.tsx`
- `src/components/CheckoutPageContent.tsx`
- `src/components/RestaurantReviewsSection.tsx`
- `src/components/Navbar.tsx`
- `src/hooks/useCategories.ts`
- `src/hooks/useRestaurants.ts`
- `src/features/home-discovery/hooks/useHomeAddressRecovery.ts`
- `src/store.ts`

### Possible new frontend files

- `src/hooks/useAuthBootstrap.ts`
- `src/hooks/useRestaurantShell.ts`
- `src/hooks/useRestaurantCategories.ts`
- `src/hooks/useRestaurantCategoryItems.ts`
- `src/hooks/useCheckoutContext.ts`
- `src/hooks/useBranchReviews.ts`
- `src/components/restaurant/RestaurantShell.tsx`
- `src/components/restaurant/RestaurantMenuContent.tsx`
- `src/components/restaurant/RestaurantDeferredTools.tsx`

## 8) Success Criteria

This plan is successful when all of the following are true:

- opening reviews does not trigger full consumer bootstrap unless truly required
- home no longer eagerly hydrates saved carts and rich consumer context by default
- restaurant shell becomes visible before the entire menu dataset is ready
- category navigation appears before full menu completion
- checkout reuses restaurant-route data instead of refetching it unconditionally
- MainApp is decomposed enough that cart or modal state updates do not broadly rerender the entire route
- home and search reuse caches for slow-changing data such as categories and discovery lists

## 9) Risks And Dependencies

### Frontend-only risks

- moving bootstrap logic may accidentally break protected-route redirects if not isolated carefully
- decomposing MainApp can introduce state synchronization bugs if phases are not kept small

### Backend dependency risks

- the best version of progressive menu loading depends on API support for categories-first and chunked item loading
- checkout data reuse is easiest when the API exposes a stable checkout context contract

### Recommended delivery rule

Do not attempt the entire plan in one pass. Implement by phase, measure each phase, and avoid mixing bootstrap refactors with progressive menu loading in the same PR.

## 10) Recommended Execution Order

1. Root bootstrap split
2. Query-cache foundation
3. Checkout deduplication
4. Restaurant progressive loading
5. MainApp decomposition
6. Home and search cleanup
7. Post-change profiling and browser verification

## 11) Done When

- route traces show clear reduction in duplicate and non-essential requests
- the restaurant menu feels materially faster to enter and interact with
- reviews and checkout transitions no longer pull unrelated data by default
- state ownership is simpler, more local, and easier to reason about than the current design