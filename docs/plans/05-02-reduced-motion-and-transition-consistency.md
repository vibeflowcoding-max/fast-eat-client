# Plan 05.02 — Reduced Motion and Transition Consistency

## Objective

Deliver smooth, consistent UI transitions while respecting reduced-motion preferences and avoiding unnecessary animation overhead.

## Scope

- Standardize transition durations/easings.
- Ensure animation wrappers are motion-safe.
- Remove abrupt state changes in key interactions.

## Implementation Plan

1. Inventory animated surfaces:
   - rail load transitions
   - card hover/tap states
   - assistant dialog and compare sheet transitions
2. Apply `motion-safe` classes consistently.
3. Add reduced-motion fallback behavior (no transform-heavy transitions).
4. Keep transitions short and non-blocking.

## Files

- `src/features/home-discovery/components/HomeRailSkeleton.tsx`
- `src/features/home-discovery/components/HomeDiscoveryWidget.tsx`
- `src/features/home-discovery/components/PriceComparisonSheet.tsx`
- card and rail components with interaction transitions

## Performance Constraints

- Avoid layout thrashing and expensive paint effects.
- Prefer opacity/transform-based transitions.

## Testing

- Manual verification with reduced-motion system setting enabled.
- Visual QA to ensure transitions feel consistent.

## Acceptance Criteria

- No motion-heavy transitions under reduced-motion preference.
- Transition style is consistent across major interactive surfaces.

## Rollout

- Ship with `home_motion_polish_v1` if staged rollout desired.

## Definition of Done

- Reduced-motion path verified.
- Transition regressions absent in Home discovery flow.
- Performance budgets remain within thresholds.

## Implementation Checklist

- [ ] Inventory animated surfaces in Home and overlays.
- [ ] Standardize transition duration/easing tokens.
- [ ] Apply `motion-safe` and reduced-motion fallbacks.
- [ ] Remove abrupt transitions in critical interactions.
- [ ] Verify performance impact on animation changes.
- [ ] Validate reduced-motion experience manually.
- [ ] Roll out behind `home_motion_polish_v1` if staged release is needed.
