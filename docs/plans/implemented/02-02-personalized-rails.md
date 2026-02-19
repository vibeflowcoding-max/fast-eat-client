# Plan 02.02 — Personalized Rails (For You + Recently Viewed)

## Objective

Increase revisit speed and relevance by surfacing personalized rails based on lightweight behavior signals.

## Scope

- Add `Recently Viewed` rail.
- Add `For You` rail derived from recent interactions.
- Keep logic simple and deterministic for v1.

## Data Strategy

- Store recently viewed restaurant IDs + timestamps in local storage.
- Build preference hints from:
  - clicked categories
  - preferred ETA/price patterns

## Implementation Plan

1. Extend discovery storage utilities with viewed-item store.
2. Capture view events when restaurant is opened from Home.
3. Add rail builders in `useHomeRails`:
   - `recently-viewed`
   - `for-you`
4. Apply deduping against existing rails.
5. Hide rails when insufficient data exists.

## Files

- `src/features/home-discovery/utils/discoveryStorage.ts`
- `src/components/HomePage.tsx`
- `src/features/home-discovery/hooks/useHomeRails.ts`

## Analytics

- `personalized_rail_impression`
- `personalized_rail_item_click`

## Testing

- Unit tests for deduping and ordering.
- Tests for empty-history behavior.

## Rollout

- Feature flag: `home_personalized_rails_v1`.
- Rollout only for returning sessions first.

## Risks & Mitigations

- Risk: stale recommendation drift.
  - Mitigation: TTL and cap list length.
- Risk: privacy concerns.
  - Mitigation: local-only storage and clear-history option.

## Definition of Done

- Personalized rails appear only with valid behavior signal.
- No duplicate cards across adjacent rails.
- Positive engagement trend on personalized rail CTR.

## Implementation Checklist

- [x] Define behavior signals and storage format.
- [x] Persist viewed restaurants with timestamp and cap.
- [x] Build `recently-viewed` rail generator.
- [x] Build deterministic `for-you` rail generator.
- [x] Add cross-rail dedupe safeguards.
- [x] Add analytics for personalized rail impression/click.
- [x] Add tests for empty history and dedupe logic.
- [x] Roll out behind `home_personalized_rails_v1`.
