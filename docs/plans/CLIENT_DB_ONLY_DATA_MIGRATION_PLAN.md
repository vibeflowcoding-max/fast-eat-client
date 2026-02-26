# CLIENT DB-Only Data Migration Plan

## 1) Objective

Remove all runtime hardcoded/synthetic business data from `fast-eat-client` and ensure database/API is the single source of truth for all database-related flows.

## 2) Scope

### In scope
- Discovery runtime flows (recommendations, compare, predictive, surprise, dietary check)
- Home feed modules that currently use mock/static business entities
- Gamification and content modules that currently seed fake user/business state
- API proxy/route behaviors that silently mask missing data with generated values
- Data contract hardening between client routes and backend/Supabase

### Out of scope
- Pure UI constants (labels, locale text, icons, layout-only arrays)
- Unit test mocks and fixtures used only in tests

## 3) Reviewed Code Areas (current state)

### Critical current findings
- `src/features/home-discovery/components/PredictivePrompt.tsx`
  - Sends `mockOrderHistory` and fixed location payload in runtime.
- `src/app/api/discovery/predictive-reorder/route.ts`
  - Returns mock IDs (`mock-resta`, `mock-item`) when AI key is absent.
- `src/features/content/components/StoryMenuFeed.tsx`
  - Uses `MOCK_STORIES` as runtime source.
- `src/features/gamification/store/useLoyaltyStore.ts`
  - Seeds user points/streak/badges with fake values.

### High-risk synthetic score/value generation
- `src/app/api/discovery/_lib.ts`
  - Uses `estimateBasePrice`, `estimateDiscount`, `estimateEta`, `estimateRating` fallbacks.
- `src/app/api/discovery/compare/route.ts`
  - Uses synthetic base price seed, ETA seed, and fallback labels.
- `src/features/home-discovery/hooks/useHomeRails.ts`
  - Uses client-side estimates for price/fee/ETA where DB fields are missing.

### Medium-risk masking fallbacks
- `src/services/api.ts`
  - Injects generic menu defaults (`Platillo`, generic description/category, stock image).
- `src/hooks/useAppData.ts`
  - Builds synthetic cart items when server returns unmatched entries.
- `src/lib/supabase.ts`
  - Placeholder URL/key fallback allows silent misconfiguration.

## 4) Target State (DB-First Rules)

1. No runtime business entity can be synthesized if DB/API data is missing.
2. Missing DB data must produce explicit error/loading/empty states, not invented values.
3. Discovery scoring may rank only real values from persisted fields.
4. If AI provider is unavailable, fallback can be deterministic UX text only, never fake business IDs/items/prices.
5. Client must fail fast on missing Supabase env credentials in all DB-dependent routes.

## 5) Behavior-First Definitions

### Predictive Prompt
- Primary action: open target restaurant/item from DB-backed predictive result.
- Secondary action: dismiss banner for session.
- Fallback when data missing: route user to generic discovery view; do not inject fake history/IDs.
- Success feedback: banner conversion tracked.
- Error feedback: actionable retry state.
- Tracking: impression, click, dismiss, conversion, fallback_shown.

### Surprise Me
- Primary action: navigate to a real item in a real restaurant.
- Secondary action: regenerate suggestion.
- Fallback when AI unavailable: use DB-ranked deterministic selection only.
- Success/error feedback: selected item shown or clear failure state.
- Tracking: impression, click, regenerate, conversion, fallback_shown.

### Dietary Check
- Primary action: evaluate real menu item ingredients against real profile.
- Secondary action: view details/warnings.
- Fallback when provider unavailable: explicit “analysis unavailable”; never pseudo-medical heuristic output.
- Tracking: check_request, check_success, check_error, fallback_shown.

## 6) Implementation Sequence

### Phase A (Critical blockers)
1. Replace mock payload in `PredictivePrompt` with customer DB-derived order-history endpoint payload.
2. Remove mock-return branches in:
   - `predictive-reorder/route.ts`
   - `surprise/route.ts`
   - `dietary-check/route.ts`
3. Replace `StoryMenuFeed` runtime source with DB/API endpoint.
4. Replace seeded loyalty initial state with API/bootstrap fetch.

### Phase B (Synthetic value removal)
1. Refactor `discovery/_lib.ts` to require persisted pricing/ETA/rating inputs.
2. Refactor `discovery/compare/route.ts` to compare only real values and exclude incomplete rows.
3. Remove client estimation logic in `useHomeRails.ts`; consume computed metrics from API only.

### Phase C (Fallback hardening)
1. Tighten menu/cart mapping in `services/api.ts` and `useAppData.ts`.
2. Remove placeholder Supabase credentials fallback in `src/lib/supabase.ts`.
3. Replace default branch UUID fallback with explicit required session/config handling.

## 7) Data Contract Requirements (client-facing)

Required fields per restaurant listing entity:
- `id`, `name`, `avg_price_estimate`, `estimated_delivery_fee`, `eta_min`, `rating`, `review_count`

Required fields for predictive/surprise actions:
- `restaurantId`, `itemId`, `confidence`, `reason`

Required fields for dietary checks:
- item ingredients list + dietary profile payload resolved from DB/profile API

If any required field is absent:
- Exclude item from actionable rails/compare outputs
- Emit telemetry for missing-field diagnostics

## 8) Verification Plan

### API verification
- Validate every affected endpoint returns no synthetic IDs/prices/ETA/rating in production mode.
- Validate 4xx/5xx behavior is explicit and typed.

### UI verification
- Validate banners/cards/actions render from DB-backed payloads only.
- Validate no fallback-generated business entities appear in UI.

### Data sufficiency check
- Confirm realistic records exist for restaurants, branches, menu, orders, profile, favorites, loyalty/story data.

## 9) Risks and Dependencies

- Backend may need additional fields exposed for discovery ranking.
- AI routes need deterministic non-mock behavior when providers are unavailable.
- Removing synthetic fallback may initially reduce shown items until data quality is improved.

## 10) Done Criteria

- Zero runtime `mock`/synthetic business values in production code paths.
- Discovery, predictive, surprise, dietary, story, loyalty flows all use DB/API data.
- Missing data paths surface explicit UX states (loading/error/empty), not fabricated entities.
- End-to-end smoke checks pass for home/search/discovery/order/profile flows.
