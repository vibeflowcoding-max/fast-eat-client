# Client Discovery Engine De-Hardcode Plan

## Purpose

Convert discovery flows from mixed real+synthetic logic to strict DB-backed logic across:
- recommendations
- compare
- chat assistant suggestions
- predictive reorder
- surprise me
- dietary check

## Current Analysis (by file)

### `src/app/api/discovery/_lib.ts`
- Problem: fallback estimators fabricate core business values (`price`, `discount`, `eta`, `rating`) when missing.
- Impact: ranking and user decisions can rely on non-authoritative values.

### `src/app/api/discovery/compare/route.ts`
- Problem: fallback seed price (`basePriceSeed`) and synthetic ETA (`20 + index * 4`).
- Impact: comparison result can be materially inaccurate.

### `src/app/api/discovery/predictive-reorder/route.ts`
- Problem: mock response with fake IDs in missing-key mode.
- Impact: fake targets can leak to UI flow.

### `src/app/api/discovery/surprise/route.ts`
- Problem: mock result path + AI prompt explicitly allows invented menu items.
- Impact: recommendation may not exist in DB menu.

### `src/app/api/discovery/dietary-check/route.ts`
- Problem: mock heuristic with fixed confidence.
- Impact: non-authoritative dietary safety outputs.

### `src/features/home-discovery/hooks/useHomeRails.ts`
- Problem: client-side estimators for fee/ETA/final price.
- Impact: rails/sorting/filtering may diverge from backend truth.

## Target Design

1. Discovery API computes recommendations only from persisted fields.
2. Records missing required ranking fields are excluded or downgraded with explicit reason tags, never guessed.
3. Compare endpoint returns `incomplete_data` errors if selected restaurants lack required fields.
4. Predictive/surprise routes return typed `unavailable`/`provider_unavailable` states instead of mock entities.
5. Dietary route returns `analysis_unavailable` if required provider/data is missing.
6. Client rails consume backend-computed metrics only.

## Required Backend/DB Inputs

### Restaurant ranking fields
- `avg_price_estimate`
- `estimated_delivery_fee`
- `eta_min`
- `rating`
- `review_count`

### Surprise/predictive action fields
- Real `restaurantId` + real `menu_item_id`
- Confidence score + explanation

### Dietary fields
- Menu item ingredient list
- User dietary profile from persisted profile settings

## Migration Steps

### Step 1: Discovery foundation hardening
- Remove `estimate*` fallback family from `_lib.ts`.
- Introduce required-field guards and row exclusion.
- Emit structured logs for excluded rows.

### Step 2: Compare hardening
- Remove `basePriceSeed` and synthetic ETA.
- Return explicit status when comparison lacks complete data.

### Step 3: Predictive/Surprise hardening
- Remove mock return branches.
- Replace with:
  - provider unavailable response (non-actionable)
  - or DB-driven deterministic fallback selection

### Step 4: Dietary hardening
- Remove heuristic mock output.
- Return typed unavailable state when AI/provider is down.

### Step 5: Client rail alignment
- Remove `estimateDeliveryFee`, `estimateEta`, `estimateFinalPrice` fallback behavior.
- Sort/filter only on authoritative fields.

## Behavior Definitions

### Discovery Compare
- Primary: compare real totals and timing from persisted values.
- Secondary: back to recommendations.
- Missing data fallback: show “comparison unavailable due to incomplete pricing data”.
- Tracking: compare_open, compare_result, compare_error, compare_incomplete_data.

### Discovery Chat
- Primary: answer + recommendations from real DB-backed recommendation set.
- Secondary: follow-up prompt chips.
- Missing data fallback: “could not find complete data now”, no synthetic business values.
- Tracking: chat_query, chat_result, chat_fallback, chat_error.

## Validation Plan

- Contract tests for each route ensuring no synthetic IDs/prices/eta/rating are emitted.
- QA flow checks:
  - Home recommendations
  - Compare
  - Predictive prompt
  - Surprise me
  - Dietary check

## Done Criteria

- No discovery route emits fabricated business entities or seeded numeric estimates.
- All discovery UI decisions are sourced from DB/backend contract values.
- All unavailable conditions are explicit, typed, and tracked.
