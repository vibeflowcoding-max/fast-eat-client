# Fast Eat Client — UI Improvements Roadmap

## Purpose

This document defines a practical UI/UX improvement backlog for the consumer app, with implementation detail focused on:

1. Better visual quality and perceived product trust.
2. Faster discovery and decision making.
3. Higher conversion from Home → restaurant → cart → checkout.
4. Maintainable, incremental delivery with low regression risk.

---

## Principles

- Keep existing architecture and components where possible; improve through composition.
- Prefer incremental changes behind feature flags.
- Every UI enhancement should include loading/error/empty states.
- Optimize for mobile-first interactions and accessibility.
- Instrument everything important so impact can be measured.

---

## 1) Visual Foundation Upgrade

### 1.1 Home visual hierarchy refresh

**What will be done**
- Redesign Home section spacing, typography scale, and heading hierarchy.
- Improve hero/search prominence and section readability.

**How it will be implemented**
- Refactor `HomeHeroSearch` spacing and heading tokens.
- Standardize section title/subtitle styles in `RestaurantRail` and related components.
- Introduce consistent vertical rhythm (e.g., shared spacing constants/class utilities).

**Files likely touched**
- `src/features/home-discovery/components/HomeHeroSearch.tsx`
- `src/features/home-discovery/components/RestaurantRail.tsx`
- `src/components/HomePage.tsx`

**Acceptance criteria**
- Home is visually scannable in under ~3 seconds.
- No horizontal overflow on target mobile/tablet/desktop breakpoints.

---

### 1.2 Restaurant card modernization

**What will be done**
- Improve card structure and metadata presentation (ETA, final price estimate, promo, rating confidence).
- Add cleaner image treatment and fallback behavior.

**How it will be implemented**
- Update card layout slots (image, badge row, metadata row, CTA).
- Add subtle hover/tap/press interaction states.
- Rework fallback media handling using existing placeholder assets.

**Files likely touched**
- `src/components/RestaurantCard.tsx`
- `public/placeholder-restaurant.svg`

**Acceptance criteria**
- Card information fits common screen widths without truncation issues.
- Interaction states are consistent and accessible.

---

### 1.3 Loading, empty, and error polish

**What will be done**
- Improve section-level skeletons and empty/error visuals.
- Replace plain text fallbacks with actionable guidance.

**How it will be implemented**
- Extend `HomeRailSkeleton` to better mimic final content structure.
- Upgrade `HomeErrorState` with clear recovery CTAs.
- Add contextual empty state messages based on active filters/intents.

**Files likely touched**
- `src/features/home-discovery/components/HomeRailSkeleton.tsx`
- `src/features/home-discovery/components/HomeErrorState.tsx`
- `src/features/home-discovery/components/RestaurantRail.tsx`

**Acceptance criteria**
- No full-page blocking loaders during Home interactions.
- Every async section has meaningful fallback actions.

---

## 2) Discovery and Navigation Features

### 2.1 Sticky quick filters and sort controls

**What will be done**
- Add quick filters: price, ETA, rating, delivery fee, promotions.
- Add sort options: best value, fastest, top rated, closest.

**How it will be implemented**
- Add a filter/sort state model in Home container.
- Extend `useHomeRails` ordering/filter logic.
- Emit analytics events for filter/sort usage.

**Files likely touched**
- `src/components/HomePage.tsx`
- `src/features/home-discovery/hooks/useHomeRails.ts`
- `src/features/home-discovery/types.ts`
- `src/features/home-discovery/analytics.ts`

**Acceptance criteria**
- Filter and sort changes reflect instantly without route reload.
- Selected controls are keyboard-accessible and visually clear.

---

### 2.2 Personalized rails (For You + Recently Viewed)

**What will be done**
- Add a “For You” rail from user behavior.
- Add “Recently viewed restaurants” for quick return navigation.

**How it will be implemented**
- Persist lightweight viewed-restaurant history in local storage.
- Build rail generation logic using recent interactions.
- Guard for empty history (don’t render section if empty).

**Files likely touched**
- `src/features/home-discovery/utils/discoveryStorage.ts`
- `src/components/HomePage.tsx`
- `src/features/home-discovery/hooks/useHomeRails.ts`

**Acceptance criteria**
- Recently viewed rail appears after valid interactions.
- No duplicate items in personalized rails.

---

### 2.3 Search suggestions and recovery UX

**What will be done**
- Add typeahead suggestions for restaurants/categories.
- Improve “no results” with smart alternatives.

**How it will be implemented**
- Add debounced suggestion fetch from existing APIs.
- Render suggestion dropdown under `HomeHeroSearch`.
- Show fallback recommendations when query has no direct matches.

**Files likely touched**
- `src/features/home-discovery/components/HomeHeroSearch.tsx`
- `src/components/HomePage.tsx`
- `src/hooks/useRestaurants.ts`

**Acceptance criteria**
- Suggestions appear under 300ms for cached/local paths.
- No-results state provides at least two clear next actions.

---

## 3) AI Assistant UX Enhancements

### 3.1 Rich recommendation response cards

**What will be done**
- Improve assistant responses with reason tags, confidence hints, and clearer compare path.

**How it will be implemented**
- Extend response card UI in `HomeDiscoveryWidget`.
- Surface explainability fields from discovery APIs.
- Add better CTA grouping (open restaurant / compare / follow-up).

**Files likely touched**
- `src/features/home-discovery/components/HomeDiscoveryWidget.tsx`
- `src/features/home-discovery/hooks/useHomeDiscoveryChat.ts`
- `src/app/api/discovery/chat/route.ts`

**Acceptance criteria**
- Each recommendation card has at least one reason visible.
- Compare action remains available when compare options exist.

---

### 3.2 Quick ask presets by context

**What will be done**
- Add dynamic quick prompts based on current context (budget/intent/location).

**How it will be implemented**
- Build quick prompt generator utility.
- Feed prompt context from Home selected intent + constraints.
- Track prompt usage via analytics.

**Files likely touched**
- `src/features/home-discovery/components/HomeDiscoveryWidget.tsx`
- `src/features/home-discovery/types.ts`
- `src/features/home-discovery/analytics.ts`

**Acceptance criteria**
- Prompt set changes contextually without reducing discoverability.
- Prompt click-through is tracked by variant.

---

## 4) Cart and Checkout UI Transparency

### 4.1 Sticky mini-cart and fee breakdown

**What will be done**
- Add persistent mini-cart summary with total and ETA context.
- Add clear fee breakdown panel before final checkout.

**How it will be implemented**
- Reuse existing cart store for live totals.
- Add a lightweight sheet/drawer component for fee details.
- Ensure compare and fee language uses consistent terms.

**Files likely touched**
- `src/store.ts`
- `src/components/*cart*`
- `src/features/home-discovery/components/PriceComparisonSheet.tsx`

**Acceptance criteria**
- Users can understand final total composition without leaving checkout flow.
- Cart summary remains visible on major mobile viewports.

---

### 4.2 Price optimization prompt

**What will be done**
- Show “same basket cheaper” suggestions before checkout.

**How it will be implemented**
- Use compare endpoint with current cart context.
- Render non-blocking prompt card with one-tap compare/open.
- Add event tracking for impression and acceptance.

**Files likely touched**
- `src/app/api/discovery/compare/route.ts`
- `src/features/home-discovery/services/discoveryClient.ts`
- Checkout-related UI components

**Acceptance criteria**
- Prompt appears only when meaningful savings exist.
- Prompt does not interrupt critical checkout interactions.

---

## 5) Accessibility and Motion Polish

### 5.1 Focus, keyboard, and labels

**What will be done**
- Complete keyboard and focus-state pass for Home, assistant, comparison, and filters.

**How it will be implemented**
- Add missing focus styles and keyboard handlers.
- Verify semantic labels and ARIA in interactive controls.
- Expand a11y tests where interaction changed.

**Files likely touched**
- Home discovery components + existing a11y tests

**Acceptance criteria**
- Keyboard-only path can complete discovery and compare flows.
- Existing a11y tests remain green; new tests added where needed.

---

### 5.2 Reduced motion and transition consistency

**What will be done**
- Ensure all animations respect reduced-motion preference.

**How it will be implemented**
- Wrap animations in `motion-safe` patterns.
- Replace abrupt state changes with lightweight transitions where appropriate.

**Acceptance criteria**
- App remains comfortable for users with reduced motion enabled.

---

## 6) Analytics, KPIs, and Validation

## Metrics to track per improvement

- Home CTR (`home_view` → `rail_item_click`)
- Add-to-cart from Home/assistant
- Compare open/select rates
- Checkout start/completion
- Time to first meaningful action

## Validation approach

- Feature-flag every major UI change.
- Run A/B where applicable.
- Use rollout scripts and 72h monitoring gates before full release.

---

## 7) Suggested Delivery Plan

### Phase 1 (1–2 weeks): Visual + quick discovery wins
- Home hierarchy refresh
- Card modernization
- Better loading/empty/error states
- Sticky filters + sort

### Phase 2 (1–2 weeks): Assistant and personalization
- Rich assistant cards
- Context-aware quick prompts
- Recently viewed + For You rails

### Phase 3 (1–2 weeks): Checkout confidence
- Mini-cart improvements
- Fee transparency panel
- Price optimization prompt

### Phase 4 (ongoing): Optimization
- A/B tuning
- Performance polishing
- Accessibility hardening and regression prevention

---

## 8) Definition of Done for UI improvements

A UI initiative is complete when:

- UX behavior is implemented behind a safe flag or controlled rollout.
- Loading/error/empty states are explicitly handled.
- Accessibility checks pass for modified flows.
- Telemetry exists for impact measurement.
- No critical regressions in onboarding/search/navigation/checkout.
