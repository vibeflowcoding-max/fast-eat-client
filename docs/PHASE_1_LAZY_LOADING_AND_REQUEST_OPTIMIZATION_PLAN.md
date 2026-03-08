# Phase 1 — Lazy Loading and Request Optimization Plan (fast-eat-client)

## Objective
Reduce initial bundle weight and unnecessary network activity across the full `fast-eat-client` app while preserving current UX, auth flow, and realtime order features.

## Scope
- App routes and route entry points in `src/app/**/page.tsx`
- High-cost client components in restaurant/menu and home discovery views
- Request-heavy hooks (`useAppData`, `useRestaurants`, `useCategories`) and auth bootstrap behavior

## Current-State Analysis

### 1) Routing and loading behavior
- Next App Router already provides route-level code splitting by default.
- Additional optimization is still needed because several route files eagerly import heavy client components.
- The restaurant view (`src/components/MainApp.tsx`) imports many modal/interactive components eagerly, increasing first-load JavaScript cost.

### 2) Request hotspots
- `useAppData` runs a serial set of calls on every dependency change (`branchId`, `fromNumber`, `isTestMode`) without cancellation guards:
  - restaurant info
  - table quantity
  - menu
  - cart sync
- `useRestaurants` re-fetches as options change and currently has no request cancellation for in-flight list fetches.
- `useCategories` always fetches on mount and has no in-memory cache/cancellation.
- Search and profile/order pages make expected calls but can still benefit from lazy loading of large visual modules.

### 3) Risk points
- Branch switching can trigger overlapping requests and stale updates.
- Dynamic imports can break if moved incorrectly from server/client boundaries.
- Aggressive request suppression can cause stale UI if we over-cache.

## Target Architecture

### A. “Lazy by default” policy
Use lazy loading in three layers:
1. **Route entry wrappers**: dynamic-import heavy route components with explicit loading fallback.
2. **Feature/component splitting**: lazy-load non-critical widgets/modals in restaurant/home views.
3. **Interaction-based loading**: defer expensive components until user intent (open modal/tray).

### B. Request policy
- Add `AbortController` for request-producing hooks to cancel stale calls.
- Use in-memory module-level cache for low-churn endpoints (`/api/categories`) with short TTL.
- Avoid setting loading to true when data already exists unless truly refetching initial state.
- Prevent duplicate fetches from unstable dependencies and re-renders.

## Implementation Plan

### Step 1 — Route lazy wrappers (app-wide)
- Introduce dynamic imports in route entry files where heavy client pages are imported directly.
- Keep user-visible loading states unchanged via existing `LoadingScreen` or route skeletons.

### Step 2 — Restaurant view splitting (`MainApp`)
- Convert these to lazy imports with local loading-safe behavior:
  - `ChatWidget`
  - `OrderTrackingModal`
  - `ItemDetailModal`
  - `CartModal`
  - `ConfirmModal`
  - `BranchSelectionModal`
- Keep critical render path eager:
  - `Navbar`, `Hero`, menu list/cards, core hooks

### Step 3 — Request dedupe/cancellation
- `useAppData`:
  - abort stale request cycle when branch/identity changes
  - guard state updates after unmount/cancel
  - keep optional calls non-blocking
- `useRestaurants`:
  - add cancellation for list fetch
  - avoid stale result overwrite
- `useCategories`:
  - add short-lived in-memory cache + cancellation

### Step 4 — Validation and guardrails
- Lint + targeted tests.
- Manual network verification in browser:
  - no duplicate calls during quick route/branch changes
  - no stale data flashes after cancellation

## Request-Reduction Rules (for ongoing development)
1. Fetch on explicit need (route intent, user action, required bootstrap only).
2. Cancel in-flight requests before launching replacements.
3. Prefer cache reads for static-ish data before hitting network.
4. Do not refetch due to object identity churn; depend on stable primitives.
5. Maintain loading/error/empty states explicitly while minimizing redundant calls.

## Definition of Done
- Route and feature lazy loading in place for main heavy surfaces.
- Reduced duplicate/stale fetch behavior in key hooks.
- No auth regression.
- No regression in order/bid flow and modal actions.
- Lint and tests pass for touched areas.

## Rollout Notes
- Ship in one PR with isolated commits:
  1) route/component lazy loading
  2) request optimization
- If regressions appear, rollback by restoring eager imports in affected route first, then hook-level changes.
