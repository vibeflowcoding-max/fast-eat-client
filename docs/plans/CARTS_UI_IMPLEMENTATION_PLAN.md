# Carts UI Implementation Plan (fast-eat-client)

Last updated: 2026-03-06
Owner: Client
Scope: Planning only. No code changes.

## 1. Objective

Implement the full saved-carts user experience in `fast-eat-client` so users can:

- save a cart per restaurant or branch
- view multiple saved carts in a dedicated carts screen
- restore a saved cart back into the active ordering flow
- remove a saved cart explicitly
- keep saved carts across app reloads and future logins

This plan assumes the backend carts API will be implemented in `fast-eat-api-nestjs` and will become the primary persistence source for authenticated users.

## 2. Current State Summary

The client already contains partial carts groundwork:

- a `carts` view and related UI components exist
- client-side persistence and local fallback logic exist
- the app already has a Supabase-backed `carts` table available through the broader system
- the restaurant flow can create cart state and route to cart-related views

However, the feature is incomplete because:

- the backend API contract is not fully implemented yet
- the frontend still contains stopgap persistence logic
- full end-to-end verification for multiple restaurants has not been completed
- cart expiration behavior still needs to be removed so saved carts behave like durable user data instead of temporary session state

## 3. Frontend Goals

1. Persist saved carts through the backend API for authenticated users.
2. Load saved carts automatically when the user loads the app again.
3. Show multiple carts from different restaurants or branches in the carts screen.
4. Restore a chosen saved cart into the active restaurant ordering flow.
5. Remove saved carts only when the user explicitly deletes, submits, clears, or replaces them.
6. Remove cart expiration UI and expiry-driven cart clearing behavior.
7. Keep a local fallback path when backend persistence is unavailable.

## 4. Files And Areas To Review

Primary client files expected to be involved:

- `src/store.ts`
- `src/services/api.ts`
- `src/lib/persisted-carts.ts`
- `src/lib/saved-carts-storage.ts`
- `src/components/CartsPageContent.tsx`
- `src/components/CartsPageContent.test.tsx`
- `src/app/carts/page.tsx`
- `src/components/MainApp.tsx`
- `src/components/CheckoutPageContent.tsx`
- `src/components/ExpirationTimer.tsx`
- `src/hooks/useAppData.ts`
- locale files under `src/messages/`

Secondary areas to inspect if needed:

- route guards and auth bootstrap
- any cart restore helpers already present in the repo
- item and branch metadata mapping used to rebuild active carts

## 5. UX And Behavior Definition

### 5.1 Primary user actions

Users should be able to:

- save their current cart from a restaurant
- open the carts screen and view all saved carts
- restore a cart from the carts screen
- delete a cart from the carts screen

### 5.2 Secondary behavior

- if a cart already exists for the same branch, saving should update that saved cart instead of creating uncontrolled duplicates
- if the user opens the app later, saved carts should load automatically
- if the user visits a restaurant that already has a saved cart, the app should be able to hydrate that state cleanly

### 5.3 Fallback behavior

- if backend save or load fails, the client should use local fallback persistence instead of silently dropping carts
- if a saved cart cannot be restored because required restaurant or item metadata is incomplete, the UI should show clear feedback and fail gracefully

### 5.4 Success and error feedback

Success feedback:

- cart saved confirmation
- cart restored confirmation or immediate visible state update
- cart removed confirmation

Error feedback:

- failed save
- failed load
- failed restore
- failed delete

### 5.5 Tracking expectations

Minimum events to support:

- carts screen impression
- save cart click
- restore cart click
- delete cart click
- save success or failure
- restore success or failure

## 6. Frontend Architecture Direction

### 6.1 Source of truth

Recommended source of truth:

- backend API for authenticated persistence
- local fallback storage only when backend access fails or the user is not yet authenticated

### 6.2 Saved cart identity model

Recommended cart identity:

- one active saved cart per branch per user

This keeps the UI predictable and aligns with the recommended backend `PUT /carts` upsert contract.

### 6.3 Restore model

Restoring a saved cart should:

- load the saved cart items into the active cart store
- attach the correct restaurant or branch context
- preserve item notes and quantities
- update visible cart totals immediately
- route the user back into the relevant restaurant flow when appropriate

## 7. Implementation Workstreams

### 7.1 API Integration Layer

Target file:

- `src/services/api.ts`

Work:

- align the client carts API methods with the NestJS backend contract
- support `GET /carts`, `GET /carts/:cartId`, `PUT /carts`, and `DELETE /carts/:cartId`
- normalize error handling so the UI can distinguish backend failures from validation issues
- keep local fallback detection explicit instead of relying on brittle string matching where possible

### 7.2 Store And Persistence Flow

Target file:

- `src/store.ts`

Work:

- remove cart expiration state and timer semantics
- persist durable saved carts instead of expiring them
- load saved carts into app state on bootstrap or auth restoration
- support restoring a selected saved cart into active cart state
- keep branch-aware behavior so carts from different restaurants do not overwrite one another incorrectly

### 7.3 Persistence Helpers

Target files:

- `src/lib/persisted-carts.ts`
- `src/lib/saved-carts-storage.ts`

Work:

- align helper logic with the backend payload shape
- remove any expiry-based filtering or cleanup
- keep migration-safe local storage behavior if old expiry metadata is still present
- make local fallback durable across reloads

### 7.4 Carts Screen UI

Target files:

- `src/components/CartsPageContent.tsx`
- `src/app/carts/page.tsx`

Work:

- ensure the screen renders multiple carts from different restaurants or branches clearly
- show restaurant name, item count, subtotal, and updated time consistently
- support explicit restore and delete actions
- model loading, empty, and error states clearly
- make the UI behavior align with the resource design direction already used elsewhere in the app

### 7.5 Restaurant Flow Integration

Target files:

- `src/components/MainApp.tsx`
- `src/components/CheckoutPageContent.tsx`

Work:

- make save and restore flows visible and reliable from the restaurant experience
- ensure restoring a cart correctly rehydrates the active ordering context
- avoid stale branch switching bugs when a restored cart belongs to a different restaurant

### 7.6 Timer Removal

Target files:

- `src/store.ts`
- `src/components/MainApp.tsx`
- `src/components/ExpirationTimer.tsx`

Work:

- remove the countdown UI completely
- remove interval-based cart clearing
- remove any expiry timestamp writes or reads
- delete `ExpirationTimer.tsx` if it becomes unused

## 8. Loading, Empty, And Error States

The carts feature must explicitly support:

### Loading

- bootstrapping saved carts after login or app load
- saving a cart
- restoring a cart
- deleting a cart

### Empty

- no saved carts for this user
- no active cart and no saved carts

### Error

- backend carts fetch fails
- save fails
- delete fails
- restore fails

Recommendation:

- keep the carts view useful even when backend calls fail by showing fallback-backed state when available

## 9. API Contract Assumptions

The frontend plan assumes the backend exposes:

- `GET /carts`
- `GET /carts/:cartId`
- `PUT /carts`
- `DELETE /carts/:cartId`

Expected payload needs:

- cart id
- branch id
- restaurant context needed for display
- items with quantity and notes
- subtotal
- timestamps for display ordering

If the backend finalizes a different contract, `src/services/api.ts` should be the adaptation layer so the rest of the UI remains stable.

## 10. Test Plan

Minimum client-side coverage should include:

### 10.1 Persistence helper tests

- saved carts survive reload without expiry
- legacy expiry metadata does not cause carts to be dropped
- fallback storage preserves multiple carts

### 10.2 Store tests or store-adjacent behavior tests

- restoring a saved cart hydrates active cart state correctly
- branch-specific carts do not overwrite unrelated carts
- deleting a cart removes it from saved carts without affecting others

### 10.3 Carts UI tests

- renders multiple carts from different restaurants
- shows empty state correctly
- shows loading state correctly
- restore action triggers the expected behavior
- delete action triggers the expected behavior

### 10.4 Focused runtime verification

- create cart in restaurant A
- create cart in restaurant B
- open carts view and confirm both appear
- reload the app and confirm both persist
- if authenticated login is available, confirm the carts still load after login restoration

## 11. Verification Requirements

After implementation, verify the feature with browser testing.

Required checks:

1. Save a cart in one restaurant.
2. Save a second cart in a different restaurant.
3. Open the carts screen and confirm both cards are visible.
4. Restore one cart and confirm the active restaurant cart state matches the saved contents.
5. Delete one saved cart and confirm the other remains.
6. Reload the app and confirm remaining saved carts still load.

If backend auth or test data prevents true server-backed validation, report that explicitly and keep the local fallback path verified.

## 12. Risks And Decisions

### Risk 1: duplicate cart semantics

If the backend allows multiple carts per branch for the same user, the frontend UI becomes ambiguous.

Recommendation:

- enforce one active saved cart per branch per user

### Risk 2: stale branch context on restore

If a restored cart does not update restaurant context cleanly, users may see mismatched items or wrong branch data.

Recommendation:

- make restore branch-aware and route-aware

### Risk 3: losing carts due to expiry cleanup

This is currently a product mismatch.

Recommendation:

- remove expiry semantics completely from saved-cart flows

### Risk 4: backend-unavailable persistence gaps

Recommendation:

- keep a durable client fallback instead of failing hard

## 13. Delivery Sequence

1. Review current client carts flow and remove cart expiration semantics.
2. Align `src/services/api.ts` with the finalized NestJS carts API.
3. Update store and persistence helpers for durable saved carts.
4. Finish carts screen behavior for restore, delete, loading, empty, and error states.
5. Update tests for persistence and multi-restaurant rendering.
6. Verify the full two-restaurant flow in the browser.

## 14. Deliverables

Implementation should produce:

1. frontend carts integration with the backend API
2. durable saved-carts behavior without expiration
3. carts UI that correctly renders multiple restaurants or branches
4. restore and delete interactions wired end-to-end
5. focused automated tests for persistence and carts UI
6. browser verification of at least two restaurant carts and reload persistence