# Fast Eat Client — Home UI Modernization + AI Discovery Assistant

## 1) Purpose and expected outcome

This document defines a practical, incremental implementation plan to:

1. Modernize the Home experience so it competes with top food-delivery apps (Uber Eats / DiDi Food style expectations).
2. Add a **global discovery assistant** on Home that recommends restaurants, combos, dishes, and best-price options across restaurants.
3. Preserve the current **restaurant-context chatbot** behavior inside restaurant pages.

The scope is intentionally incremental to reduce regression risk and allow early wins with measurable impact.

---

## 2) Product goals and success criteria

## Primary goals

- Increase discovery speed from app open to first meaningful action.
- Improve value perception through transparent price comparisons and deal surfacing.
- Increase conversion from Home view to restaurant visit, add-to-cart, and checkout.
- Add AI guidance before restaurant selection while keeping existing in-restaurant AI flow unchanged.

## Business KPIs

- Home → restaurant click-through rate (CTR).
- Home → add-to-cart rate.
- Checkout start and checkout completion rates.
- Average order value (AOV).
- Session time to first action.
- Assistant-assisted conversion lift vs control group.

## Non-functional goals

- No regression in existing onboarding, search, categories, and route navigation.
- P95 recommendation response latency target (v1): <= 2.5s for cached/retrieval paths.
- Accessibility and mobile-first usability preserved or improved.

---

## 3) Current state (baseline)

## Home page (today)

- The Home route renders a Home component wrapper.
- Current Home layout includes:
  - Sticky header
  - Greeting + location status
  - Search input
  - Category bar
  - Nearby restaurants section
  - Remaining restaurants section
  - Onboarding modal and loading state

## Existing AI chat (today)

- There is already a chat widget pattern used for menu-level assistance.
- Existing chat API forwards payloads to n8n via webhook.
- Current chatbot context is restaurant/menu specific and should remain in place.

## Gaps vs competitive benchmark

- Discovery is mostly list-based instead of intent-first.
- No explicit cross-restaurant value comparison or “best total price” explanation.
- No dedicated Home assistant for global recommendations before choosing a restaurant.
- Promotions/combos/deals are not presented as first-class discovery rails.

---

## 4) Target Home information architecture

## Home IA v1

1. Sticky top bar
   - Delivery mode / context
   - Location summary
   - Universal search
2. Intent chips row (quick intents)
   - Cheap now, Fast delivery, Family combo, Healthy, Promotions, Best rated nearby
3. Curated rails (priority order)
   - Best value near you
   - Popular now
   - Combos under budget
   - Low delivery fee
   - Continue exploring (all restaurants)
4. Comparison entry points
   - Quick compare CTA from cards and from assistant responses
5. Persistent Home assistant launcher
   - Dedicated global assistant (separate from restaurant chat)

## Why this IA

- Mirrors proven user journeys in category leaders:
  - Intent-first choices
  - Fast visual merchandising
  - Easy value optimization
- Improves first 10 seconds of decision-making.

---

## 5) UX/UI modernization principles (incremental)

- Keep current stack and visual primitives; no design-system rewrite.
- Upgrade hierarchy, spacing, and card information density.
- Prefer reusable rails + cards over one-off layouts.
- Keep interactions snappy and touch-friendly for mobile.
- Explicitly model loading, empty, and error states for each rail.
- Preserve current onboarding behavior and route transitions.

## Suggested visual improvements

- Richer restaurant card metadata:
  - ETA
  - final price indicator (estimate)
  - promo badge
  - rating and review confidence
- More expressive empty states and actionable fallback suggestions.
- Skeleton loaders per section to avoid full-page blocking.

## 5.1) Web-sourced React + UI engineering best practices (must-follow)

The following practices are added as implementation standards for this project, based on current official documentation from React, Next.js App Router, and web.dev.

## A) Component architecture and purity

- Treat every React component as a pure function: same inputs (props/state/context) => same UI output.
- Keep render phase free of side effects; place side effects in event handlers first, and `useEffect` only when synchronizing with external systems.
- Use small, single-responsibility components with explicit props contracts.
- Compose reusable UI primitives (rails, cards, sheets, chips, loaders) instead of building large monolithic pages.
- Keep local mutation only for objects created during the same render; never mutate props/state/context objects directly.

## B) State management rules

- Keep state minimal and normalized.
- Avoid redundant state: if a value can be derived during render, derive it instead of storing it.
- Avoid contradictory state flags (prefer explicit status unions like `'idle' | 'loading' | 'error' | 'success'`).
- Avoid deeply nested mutable state; flatten structures where updates become error-prone.
- Store selected IDs instead of duplicating full objects in state.
- Lift state only to the closest common owner; avoid unnecessary global state.

## C) Effects, events, and data flow

- Do not use Effects for pure data transformation or event-specific logic.
- Keep user-action logic in event handlers (e.g., submit, add-to-cart, compare).
- Use Effects for external synchronization only (network sync, subscriptions, browser APIs).
- When fetching in Effects, handle cleanup/race conditions explicitly.
- Prefer custom hooks for reusable side-effect logic to avoid duplicated `useEffect` blocks.

## D) Next.js App Router boundaries

- Default to Server Components; use Client Components only for interactive UI.
- Keep `"use client"` boundaries as low as possible in the tree to reduce client bundle size.
- Use route-level and section-level loading/error UI (`loading`, Suspense, error boundaries).
- Use `Link` and route prefetching intentionally for fast navigation.
- Use Next.js image/font optimizations for visual-heavy home surfaces.

## E) Caching and performance strategy

- Define caching intent explicitly per endpoint/surface (static, revalidated, dynamic).
- Use Next.js caching primitives deliberately (`fetch` cache settings, revalidation, tagging/path invalidation where applicable).
- Prevent waterfalls with parallel data fetching for Home rails.
- Lazy-load non-critical client bundles (assistant widget, advanced compare modules, heavy dependencies).
- Keep interaction components responsive with skeletons and progressive rendering.

## F) Accessibility and inclusive UI

- Ensure full keyboard support for all interactive controls (chips, cards, launcher, chat, sheets).
- Enforce visible focus states and logical focus order.
- Respect reduced-motion preferences for animated UI.
- Meet WCAG contrast guidance targets (minimum 4.5:1 for body text, 3:1 for large text/icons where applicable).
- Do not rely on color alone to convey meaning; pair color with text/icon/pattern cues.

## G) Reliability, testing, and quality gates

- Explicitly model loading/error/empty/success states per rail and assistant flow.
- Add contract tests for API response schemas (especially AI workflow outputs).
- Add behavior-focused component tests for key user paths (discovery, compare, navigation, assistant CTA).
- Add performance checks to CI/release checklist (Core Web Vitals monitoring + bundle analysis).
- Keep observability first-class: trace IDs, latency/error metrics, and fallback-path telemetry.

## H) Source references used for this standards section

- React docs:
  - https://react.dev/learn/keeping-components-pure
  - https://react.dev/learn/choosing-the-state-structure
  - https://react.dev/learn/you-might-not-need-an-effect
- Next.js docs:
  - https://nextjs.org/docs/app/guides/production-checklist
  - https://nextjs.org/docs/app/guides/caching
  - https://nextjs.org/docs/app/guides/lazy-loading
- web.dev accessibility:
  - https://web.dev/learn/accessibility
  - https://web.dev/learn/accessibility/color-contrast

---

## 6) Technical architecture

## 6.1 Frontend architecture

### Existing components to keep

- Home shell and onboarding flow
- Existing category filtering behavior
- Existing restaurant detail flow and restaurant chat behavior

### New/updated components (proposed)

- `HomeHeroSearch`
- `IntentChipsBar`
- `RestaurantRail`
- `DealComboCard`
- `PriceComparisonSheet`
- `HomeDiscoveryWidget` (new assistant, Home-only)
- `HomeRailSkeleton`
- `HomeErrorState`

### Integration strategy

- Refactor Home page progressively:
  1. Extract rails and chips first (no AI dependency)
  2. Add comparison sheet shell
  3. Add Home assistant launcher + widget
  4. Connect real AI data and recommendation ranking

## 6.2 Backend/API architecture

### New endpoint family

- `POST /api/discovery/chat`
- `POST /api/discovery/recommendations`
- `POST /api/discovery/compare`

### Existing endpoint to preserve

- Existing menu-context chat endpoint and behavior remain unchanged

### n8n workflow strategy

- Keep current restaurant chat workflow as-is.
- Add new global workflow for Home discovery:
  - Intent detection
  - Retrieval from restaurants/menus/deals/fees
  - Rule-based reranking
  - Structured response validation

---

## 7) Proposed API contracts (pseudo-types)

```ts
// Shared
interface UserConstraints {
  budgetMax?: number;
  partySize?: number;
  etaMaxMinutes?: number;
  dietary?: string[];
  cuisines?: string[];
  avoidIngredients?: string[];
}

interface LocationContext {
  lat?: number;
  lng?: number;
  areaLabel?: string;
  precision?: 'exact' | 'coarse';
}

interface RecommendationItem {
  kind: 'restaurant' | 'combo' | 'dish' | 'deal';
  id: string;
  restaurantId: string;
  title: string;
  subtitle?: string;
  basePrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  estimatedDeliveryFee?: number;
  etaMin?: number;
  score: number;
  reasons: string[];
  tags?: string[];
}
```

```ts
// Home assistant
interface DiscoveryChatRequest {
  sessionId: string;
  userId?: string;
  locale: string;
  query: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  location?: LocationContext;
  constraints?: UserConstraints;
  surface: 'home';
}

interface DiscoveryChatResponse {
  answer: string;
  recommendations: RecommendationItem[];
  followUps: string[];
  compareOptions?: {
    title: string;
    options: Array<{
      restaurantId: string;
      label: string;
      basePrice: number;
      deliveryFee: number;
      platformFee: number;
      discount: number;
      finalPrice: number;
    }>;
  };
  traceId: string;
}
```

```ts
// Non-chat recommendation feed
interface DiscoveryRecommendationsRequest {
  location?: LocationContext;
  constraints?: UserConstraints;
  intent?: 'cheap' | 'fast' | 'healthy' | 'family_combo' | 'promotions' | 'best_rated';
  limit?: number;
}

interface DiscoveryRecommendationsResponse {
  rails: Array<{
    railId: string;
    title: string;
    subtitle?: string;
    items: RecommendationItem[];
  }>;
  generatedAt: string;
  strategyVersion: string;
}
```

---

## 8) Data model additions (minimum viable)

## Required entities

- `deals`
  - id, restaurant_id, title, description
  - discount_type (percentage/fixed)
  - discount_value
  - min_order
  - starts_at, ends_at
  - active, stackable

- `combos`
  - id, restaurant_id, title, description
  - base_price, combo_price
  - available_from, available_to
  - active

- `combo_items`
  - combo_id, item_id, quantity

- `fee_rules`
  - restaurant_id or zone_id
  - delivery_fee, service_fee, platform_fee
  - free_delivery_threshold
  - time_window

- `price_snapshots` (optional in v1, recommended for v2)
  - entity_type (dish/combo)
  - entity_id
  - captured_price
  - captured_at

## Optional supporting structures

- Materialized view for recommendation features
- Geo-bucket cache table for Home rails

---

## 9) Recommendation strategy

## v1 (rules + weighted scoring)

Use deterministic ranking with explainability:

`score = w1*intentRelevance + w2*distance + w3*valueScore + w4*etaScore + w5*rating + w6*promoStrength`

Where:

- `valueScore` prioritizes lower final price, not only base price.
- hard filters are applied first (budget, dietary, delivery availability).
- tie-breakers: open status, availability confidence, freshness of deal.

## v2 (learning-enhanced)

- Use event logs to train contextual ranking (bandit/LTR hybrid).
- Keep v1 fallback for cold-start and reliability.
- Continue returning human-readable recommendation reasons.

---

## 10) Analytics and experimentation plan

## Event taxonomy

- `home_view`
- `intent_chip_click`
- `rail_impression`
- `rail_item_click`
- `compare_open`
- `compare_select`
- `home_chat_open`
- `home_chat_query`
- `home_chat_recommendation_click`
- `add_to_cart_from_home`
- `checkout_start`
- `checkout_complete`

## Event dimensions

- experiment_id
- variant_id
- strategy_version
- geo_bucket
- session_type (new/returning)

## A/B test sequence

1. Legacy list vs intent-first rails
2. Rails-only vs rails + Home assistant
3. Ranking v1 baseline vs ranking v1 with stronger value weighting

## Success evaluation

- Primary: CTR, add-to-cart rate, checkout conversion
- Secondary: time to first meaningful action, AOV, assistant engagement quality

---

## 11) Accessibility, performance, and reliability checklist

## Accessibility

- Semantic heading order for rails
- Keyboard navigation for chips/cards/chat launcher
- Focus states visible and consistent
- ARIA labels for chat controls and compare actions
- Reduced motion respect for animated elements

## Performance

- Fetch rails data with caching strategy by geo bucket
- Lazy-load non-critical rails and assistant bundle
- Section skeletons instead of whole-page blockers
- Keep payloads compact and structured
- Use image optimization and avoid layout shifts

## Reliability

- Per-rail error boundaries/fallbacks
- Retry + timeout for recommendation endpoints
- Guard against empty recommendations with default rails

---

## 12) Security and privacy guardrails

- Minimize PII in assistant payloads.
- Use coarse location option by default when possible.
- Add personalization consent state.
- Separate chat storage keys:
  - Home discovery history
  - Restaurant-context history
- Enforce server-side schema validation for n8n output.
- Add prompt-injection/tool-output sanitization in workflow.
- Include trace IDs for auditability.
- Define data retention and deletion behavior for assistant history.

---

## 13) Delivery roadmap with acceptance criteria and risks

## Phase 0 — Setup and instrumentation (2–3 days)

### Scope

- Baseline metrics, event schema, logging conventions
- Feature flags for Home rails and Home assistant

### Acceptance criteria

- Existing user flows unaffected
- Events visible in analytics pipeline

### Risks

- Incomplete event payloads
- Mitigation: event contract tests + dashboard sanity checks

## Phase 1 — Quick wins UI (1 week)

### Scope

- Intent chips
- Curated rails using existing data
- Better card metadata and skeletons

### Acceptance criteria

- No regression on onboarding/search/category filtering
- Home CTR improves vs baseline in canary audience

### Risks

- Data quality for promotions is incomplete
- Mitigation: fallback rails and graceful placeholders

## Phase 2 — v1 AI discovery (2–3 weeks)

### Scope

- New Home assistant widget
- `/api/discovery/chat` + recommendation endpoint
- n8n global discovery workflow
- deterministic v1 ranking + explainability

### Acceptance criteria

- Assistant response schema 100% valid in production logs
- Restaurant-context chat unchanged
- P95 latency target met for common queries

### Risks

- LLM variability or malformed responses
- Mitigation: strict output parser + safe fallback templates

## Phase 3 — v2 optimization (4–8 weeks)

### Scope

- price/fee-aware optimizer improvements
- richer combo/deal ingestion
- A/B testing expansion
- learning-enhanced ranking

### Acceptance criteria

- Statistically significant conversion lift vs control
- Stable reliability and no major UX regressions

### Risks

- Cold start for ML ranking
- Mitigation: hybrid ranker with confidence thresholds

---

## 14) Detailed execution checklist (task board)

Use this list directly as sprint tasks.

## Epic A — Foundation and guardrails

- [x] Define feature flags (`home_intent_rails`, `home_discovery_chat`, `home_price_compare`)
- [x] Create analytics event contract document
- [x] Add shared TypeScript types for discovery payloads/responses
- [x] Add server-side schema validation for discovery responses
- [x] Add trace ID propagation from frontend to API to n8n
- [x] Configure alerting for discovery API error rate and latency

## Epic B — Home UI modernization (non-AI)

- [x] Extract Home header/search into modular component
- [x] Implement intent chips row with active state and reset behavior
- [x] Implement reusable rail component with loading/empty/error states
- [x] Add “Best value near you” rail (heuristic from existing fields)
- [x] Add “Popular now” rail
- [x] Add “Combos under budget” placeholder rail
- [x] Add “Low delivery fee” rail (when fee data available)
- [x] Upgrade restaurant cards (ETA, promo badge, final price estimate)
- [x] Implement compare CTA and empty shell for comparison sheet
- [x] Run responsive QA on major mobile viewport sizes

## Epic C — Home discovery assistant

- [x] Implement `HomeDiscoveryWidget` shell and launcher
- [x] Reuse chat UI primitives where safe (message list/input patterns)
- [x] Use isolated local storage key for Home assistant history
- [x] Add quick prompt chips (cheap, family combo, fastest, healthy)
- [x] Create discovery API client service with timeout/retry
- [x] Integrate widget with `/api/discovery/chat`
- [x] Render structured recommendation cards from assistant responses
- [x] Add CTA from chat recommendation to restaurant route
- [x] Add CTA from chat recommendation to compare sheet
- [x] Add fallback response when assistant data is unavailable

## Epic D — Backend discovery APIs

- [x] Create `POST /api/discovery/chat`
- [x] Create `POST /api/discovery/recommendations`
- [x] Create `POST /api/discovery/compare`
- [x] Add input validation and normalization for constraints
- [x] Add response schema enforcement and sanitization
- [x] Add caching layer for repeated recommendation requests
- [x] Add structured logs with trace IDs and strategy version

## Epic E — n8n global workflow

- [x] Create separate workflow for `global_discovery`
- [x] Add intent extraction node
- [x] Add retrieval nodes for restaurants, dishes, combos, deals, fee rules
- [x] Add ranking node (v1 deterministic scoring)
- [x] Add explanation generation node
- [x] Add schema formatter/validator node
- [x] Add fallback branch for partial data availability
- [x] Add monitoring hooks for workflow failures

## Epic F — Data model and pipelines

- [x] Add `deals` table and CRUD/admin ingestion path
- [x] Add `combos` and `combo_items` tables
- [x] Add `fee_rules` table and zone mapping strategy
- [x] Add optional `price_snapshots` pipeline
- [x] Backfill sample data for key restaurants
- [x] Add nightly data consistency checks

## Epic G — Ranking and quality

- [x] Implement v1 weighted ranking function
- [x] Add tunable config for ranking weights
- [x] Add hard filters (budget/dietary/availability)
- [x] Add tie-breakers and deterministic ordering
- [x] Add confidence score and fallback thresholds
- [x] Add explainability reasons in API response

## Epic H — Analytics and experimentation

- [x] Implement event emission for all Home interactions
- [x] Verify event payloads in staging dashboards
- [x] Add experiment framework integration for variants
- [x] Run experiment A: legacy list vs intent-first rails
- [x] Run experiment B: rails-only vs rails + assistant
- [x] Analyze significance and rollout recommendations

## Epic I — Accessibility and performance hardening

- [x] Add keyboard navigation tests for chips, rails, assistant
- [x] Add focus management for modals/sheets/widgets
- [x] Add reduced motion compatibility checks
- [x] Implement section-level skeletons and avoid full blocking
- [x] Lazy-load assistant bundle and non-critical rails
- [x] Performance test: median + p95 route interaction timings

## Epic J — QA, release, and rollout

- [x] Build test matrix for onboarding/search/filter/chat/checkout interactions
- [x] Add smoke tests for discovery endpoints
- [x] Add integration test for Home assistant response rendering
- [x] Canary rollout to limited traffic cohort
- [x] Monitor metrics and error budgets for 72 hours
- [x] Full rollout decision review and rollback plan update

## Epic K — React/UI best-practices enforcement

- [x] Create a lightweight `frontend-standards.md` extracted from section 5.1 for daily developer use
- [x] Add ESLint rules/config checks for hooks correctness and anti-pattern detection
- [x] Add PR checklist items: component purity, minimal state, no redundant effects, accessibility checks
- [x] Add architecture review gate for new `"use client"` boundaries and bundle impact
- [x] Add a rule to require explicit loading/error/empty states for new async UI sections
- [x] Add test templates for rails, chips, assistant interactions, and compare flows
- [x] Add a11y test pass (keyboard, focus, contrast) for Home and assistant before each release
- [x] Add performance budget tracking (bundle delta, LCP/INP, assistant open latency)
- [x] Add schema-contract validation in CI for discovery chat/recommendation responses
- [x] Add regression watchlist for onboarding + search + category + navigation + chat coexistence

---

## 15) Definition of Done (DoD)

A phase is considered complete when:

- Functional acceptance criteria are met.
- No critical regressions found in existing user journeys.
- Event telemetry is validated and reliable.
- Accessibility checks pass for newly introduced interactions.
- Performance remains within defined thresholds.
- Rollback strategy is documented and tested.

---

## 16) Suggested ownership model

- Frontend lead: Home rails, assistant UI, comparison UX, event instrumentation
- Backend lead: discovery APIs, validation, caching, observability
- AI workflow owner: n8n orchestration, schema-constrained outputs, fallback logic
- Data owner: deals/combos/fees ingestion and quality checks
- QA owner: regression, accessibility, and release verification

---

## 17) Immediate next steps (this week)

1. Align on final API contracts and event taxonomy.
2. Add feature flags and scaffold Home rails components.
3. Implement `POST /api/discovery/recommendations` with deterministic mock ranking.
4. Ship canary for rails-only modernization.
5. Start Home assistant shell integration in parallel behind feature flag.

---

## 18) Notes

- The Home assistant and restaurant assistant should remain separate products from a context and storage perspective.
- Reuse UI primitives where it reduces implementation cost, but keep behavior and prompting isolated.
- Prioritize reliability and explainability over model sophistication in v1.
