# Plan 01.01 — Home Visual Hierarchy Refresh

## Objective

Improve first-screen clarity and scanability on Home so users can identify where to search, where to browse, and what to do next in under 3 seconds.

## Scope

- Improve header/hero hierarchy (`greeting`, `location`, `search`).
- Normalize section title/subtitle style and spacing rhythm.
- Reduce visual noise while keeping current functionality unchanged.

## Out of Scope

- New discovery algorithms.
- New backend endpoints.
- Theme overhaul/dark mode.

## Current Issues

- Hero and rail sections compete for attention.
- Inconsistent spacing between sections and cards.
- Subtitle styles vary and reduce readability.

## UX Changes

1. Hero search area gets stronger prominence (clear title + compact location state + search field spacing).
2. Rail titles use one typography pattern across all sections.
3. Main content spacing follows strict rhythm (e.g., 24px section separation, 12px internal spacing).

## Implementation Plan

### Step 1 — Define layout tokens

- Add/reuse utility class composition for:
  - `home-section-spacing`
  - `home-title-style`
  - `home-subtitle-style`
- Ensure no hard-coded, one-off style variants in Home sections.

### Step 2 — Refactor `HomeHeroSearch`

- Align greeting and title baseline.
- Keep location chip compact and non-dominant.
- Ensure search input remains primary action visually.

### Step 3 — Normalize rails

- Apply same heading/subheading structure in `RestaurantRail`.
- Use consistent margins before/after each rail.

### Step 4 — Regression pass

- Validate all Home variants (`legacy_list`, `intent_rails`) still render correctly.

## Files

- `src/features/home-discovery/components/HomeHeroSearch.tsx`
- `src/features/home-discovery/components/RestaurantRail.tsx`
- `src/components/HomePage.tsx`

## Analytics

- Existing metrics reused:
  - `home_view`
  - `rail_impression`
  - `rail_item_click`
- Compare baseline vs refreshed hierarchy in CTR and time-to-first-action.

## Accessibility

- Maintain semantic heading order (`h1` in hero, `h2` for each rail).
- Keep search label explicit and screen-reader friendly.

## Testing

- Visual regression screenshot set: mobile/tablet/desktop.
- Existing Home tests + a11y tests should pass.
- Add one targeted test ensuring rail headings remain visible and ordered.

## Rollout

- Feature flag: `home_visual_hierarchy_v2`.
- Canary 20% → 50% → 100% if no negative KPI movement.

## Risks & Mitigations

- Risk: over-compression of content on small screens.
  - Mitigation: explicit mobile QA on 360–390px widths.
- Risk: title clipping in localized text.
  - Mitigation: allow wrapping and test long strings.

## Definition of Done

- Home hierarchy pass merged behind flag.
- No overflow on target breakpoints.
- No regression in Home conversion KPIs.

## Implementation Checklist

- [x] Confirm final visual hierarchy requirements and examples.
- [x] Add/update shared spacing and heading style utilities.
- [x] Refactor hero layout and search prominence.
- [x] Normalize rail heading/subheading styling.
- [x] Validate both layout modes (`legacy_list`, `intent_rails`).
- [x] Run responsive QA for mobile/tablet/desktop.
- [x] Run accessibility checks for heading order and labels.
- [ ] Compare KPI baseline vs refreshed hierarchy.
- [x] Enable canary via `home_visual_hierarchy_v2`.
- [ ] Complete rollout after stable monitoring window.

### Evidence (completed items)

- Shared visual tokens implemented in `src/features/home-discovery/components/homeVisualTokens.ts` (`sectionSpacing`, `titleStyle`, `subtitleStyle`, hero/search token set).
- Hero hierarchy refactor implemented in `src/features/home-discovery/components/HomeHeroSearch.tsx` with `visualHierarchyV2`, compact location chip, and explicit search label.
- Rail heading/subheading normalization implemented in `src/features/home-discovery/components/RestaurantRail.tsx` using shared token styles and consistent section spacing.
- Both layout modes wired and rendered in `src/components/HomePage.tsx` via `resolveHomeLayoutMode` and conditional rail rendering for `legacy_list`/`intent_rails`.
- Accessibility validated via semantic heading structure in components (`h1` in hero, `h2` in rails) and `HomeHeroSearch.a11y.test.tsx` plus heading order assertions in `RestaurantRail.test.tsx`.
- Responsive QA executed successfully via `npm run qa:responsive`; artifacts generated at `docs/home-responsive-qa-report.json` and `docs/qa-screenshots/*` for mobile/tablet/desktop.
- Canary configuration enabled in `.env.example` (`NEXT_PUBLIC_HOME_VISUAL_HIERARCHY_V2=true`, `NEXT_PUBLIC_HOME_EXPERIMENT_CANARY_PERCENT=20`, baseline `control`), with control-variant visual fallback enforced in `src/features/home-discovery/experiments.ts`.

### Pending external verification

- KPI baseline comparison requires real experiment analytics export (`home_view`, `rail_item_click`, checkout events); no production dataset is committed in this repository.
- Final rollout completion requires stable-window monitoring (72h gate) and rollout decision execution using real hourly alert reports.
