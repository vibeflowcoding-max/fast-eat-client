# Plan 02.03 — Search Suggestions and Recovery UX

## Objective

Increase successful search outcomes by guiding users toward valid queries and offering smart fallback paths when no results are found.

## Scope

- Typeahead suggestions for restaurants/categories.
- Search fallback module for zero-result states.
- Keep API usage efficient via debounce + cancellation.

## UX Flow

1. User types in Home search.
2. Suggestion dropdown appears after debounce.
3. User selects suggestion or submits query.
4. If no results: show alternatives and quick recovery actions.

## Implementation Plan

### Suggestion layer

- Add debounced query state (250–300ms).
- Add abortable suggestion fetch.
- Prioritize exact category/restaurant matches.

### Recovery layer

- When search returns empty:
  - show top nearby alternatives
  - show popular categories as quick actions
  - show clear-search CTA

### Performance controls

- Cache recent suggestion responses in-memory by query prefix.
- Skip network call for very short inputs (e.g., <2 chars).

## Files

- `src/features/home-discovery/components/HomeHeroSearch.tsx`
- `src/components/HomePage.tsx`
- `src/hooks/useRestaurants.ts`

## Analytics

- `home_search_suggestion_impression`
- `home_search_suggestion_select`
- `home_search_no_results_recovery_click`

## Testing

- Debounce behavior tests.
- Suggestion selection tests.
- No-results recovery action tests.

## Rollout

- Feature flag: `home_search_suggestions_v1`.
- Progressive rollout with latency monitoring.

## Definition of Done

- Suggestions render reliably and quickly.
- Recovery UX gives actionable alternatives.
- Search abandonment rate decreases vs baseline.

## Implementation Checklist

- [x] Implement debounced suggestion query and cancellation.
- [x] Add suggestion dropdown UI and selection behavior.
- [x] Add in-memory prefix cache for suggestions.
- [x] Add no-results recovery actions and alternative rails.
- [x] Emit suggestion and recovery analytics events.
- [x] Add tests for debounce/select/no-results paths.
- [x] Validate latency target for suggestion rendering.
- [x] Roll out behind `home_search_suggestions_v1`.
