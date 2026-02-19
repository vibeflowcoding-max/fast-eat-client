# Plan 02.01 — Sticky Filters and Sort Controls

## Objective

Reduce decision friction by enabling users to quickly constrain and reorder results without losing context.

## Scope

- Sticky quick-filter bar.
- Sort controls (value/ETA/rating/distance).
- State persistence during Home session.

## UX Design

- Horizontal chip row pinned below header.
- Active chip state visually distinct.
- Sort selector in same interaction plane (chip or compact menu).

## Filter/Sort Model

- Filters:
  - `price_band`
  - `eta_max`
  - `rating_min`
  - `delivery_fee_max`
  - `promotions_only`
- Sort:
  - `best_value`
  - `fastest`
  - `top_rated`
  - `closest`

## Implementation Plan

1. Add filter/sort state in `HomePage`.
2. Extend `useHomeRails` to apply filter-first then sort.
3. Add reset action (“clear all”).
4. Emit analytics on each state change.
5. Add compact mobile overflow behavior for chips.

## Files

- `src/components/HomePage.tsx`
- `src/features/home-discovery/hooks/useHomeRails.ts`
- `src/features/home-discovery/types.ts`
- `src/features/home-discovery/analytics.ts`

## Analytics

- New events:
  - `home_filter_apply`
  - `home_filter_clear`
  - `home_sort_change`

## Testing

- Unit tests for filter/sort logic combinations.
- Interaction tests for chip toggling and clear-all.

## Rollout

- Feature flag: `home_filters_sort_v1`.
- Start at 25% and compare CTR/add-to-cart vs baseline.

## Definition of Done

- Filter/sort works without page reload.
- Keyboard navigation and focus states pass.
- No performance regression on Home interaction latency.

## Implementation Checklist

- [x] Finalize filter set and sort priority options.
- [x] Implement filter/sort state in Home container.
- [x] Extend rail ordering/filter logic in `useHomeRails`.
- [x] Add clear-all behavior and chip overflow handling.
- [x] Emit `home_filter_apply`, `home_filter_clear`, `home_sort_change` events.
- [x] Add unit tests for filter/sort combinations.
- [x] Validate keyboard navigation for controls.
- [x] Run canary rollout via `home_filters_sort_v1`.
