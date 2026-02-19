# Plan 01.03 — Loading, Empty, and Error Polish

## Objective

Improve perceived performance and resilience by making every asynchronous Home section informative and actionable in all states.

## Scope

- Section-level skeleton improvements.
- Better empty states with next-action guidance.
- Better error states with retry and fallback guidance.

## State Model

For each rail and assistant-related panel:

- `loading`
- `success with data`
- `success empty`
- `error retriable`

## Implementation Plan

### Step 1 — Skeleton parity

- Update `HomeRailSkeleton` to mirror final card structure more closely.
- Ensure no full-page loader appears once initial shell is mounted.

### Step 2 — Empty states

- Add contextual messaging:
  - no results for query
  - no results for active intent/filter
  - no nearby results
- Add explicit action buttons where applicable (clear filters/retry broad search).

### Step 3 — Error states

- Upgrade `HomeErrorState` with:
  - concise problem statement
  - retry button
  - fallback action (e.g., clear filters)

### Step 4 — Unified state rendering helper

- Standardize render flow in `RestaurantRail` to avoid one-off branching differences.

## Files

- `src/features/home-discovery/components/HomeRailSkeleton.tsx`
- `src/features/home-discovery/components/HomeErrorState.tsx`
- `src/features/home-discovery/components/RestaurantRail.tsx`

## Analytics

- Add/verify events:
  - `rail_error_retry_click`
  - `rail_empty_state_action_click`

## Accessibility

- Loading regions should be announced politely where relevant.
- Error text must be readable and connected to action controls.

## Testing

- Unit tests for all four section states.
- Interaction tests for retry and fallback actions.

## Rollout

- Feature flag: `home_state_polish_v1`.
- Rollout with error-rate monitoring enabled.

## Risks & Mitigations

- Risk: too many state-specific strings become inconsistent.
  - Mitigation: centralize messages/constants.

## Definition of Done

- All sections render complete state set.
- Retry actions function and emit analytics.
- No blocking full-page loaders during incremental updates.

## Implementation Checklist

- [x] Define canonical state model for each async section.
- [x] Update skeleton layout to match final card structure.
- [x] Add contextual empty states and actions.
- [x] Upgrade error state with retry + fallback actions.
- [x] Standardize state rendering branch logic.
- [x] Add/validate analytics for retry and empty-state actions.
- [x] Add tests for loading/success-empty/error transitions.
- [x] Roll out behind `home_state_polish_v1`.
