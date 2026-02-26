# Reviews System — UI Implementation Plan (fast-eat-client)

## Scope
Implement customer-facing review flows for:
- **Restaurant review**: 1–5 stars + comment
- **Delivery review**: 1–5 stars + comment

This plan is UI-only and depends on the API plan in `fast-eat-api-nestjs`.

## Current Product Context
- Existing review entry points naturally available in:
  - `orders/[orderId]` detail page (best context)
  - `orders` history page (secondary quick access)
- Existing restaurant discovery surfaces can display aggregates/comments after write path is complete.

---

## Behavior Definition (mandatory)

### 1) Order Detail Review Card (primary entry)

#### Primary action
- Customer selects `rating` (1–5 stars), writes optional `comment`, taps **Submit review**.

#### Secondary action
- **Not now** dismisses the card for current session.
- If review already exists, show **Edit review**.

#### Fallback behavior
- If order is not completed/delivered: show disabled state with reason.
- If delivery target is missing (no accepted driver/bid): hide delivery composer and show restaurant-only composer.
- If permissions/identity missing: show actionable error with retry/login path.

#### Success/error feedback
- Success: inline confirmation + toast, card changes to “Your review submitted”.
- Error: inline message + retry CTA, preserve typed comment.

#### Tracking events
- `review_card_impression`
- `review_start`
- `review_submit_click`
- `review_submit_success`
- `review_submit_error`
- `review_dismiss`
- `review_edit_click`

### 2) Orders History quick action (secondary entry)

#### Primary action
- On completed orders, show `Rate order` CTA -> deep link to `orders/[orderId]#reviews`.

#### Secondary action
- `Skip` (no modal required).

#### Fallback behavior
- Hide CTA for non-eligible orders.

#### Success/error feedback
- Reuse detail page feedback state.

#### Tracking events
- `order_history_review_cta_impression`
- `order_history_review_cta_click`

---

## UX Placement Recommendation

### Recommended final placement
1. **Order Detail page** (`src/app/orders/[orderId]/page.tsx`) as canonical write UI.
2. **Orders list/history** (`src/app/orders/page.tsx`) as lightweight CTA only.
3. **Restaurant surfaces** (`Home` / restaurant view) as read-only aggregate + recent comments.

Why:
- avoids anonymous/misattributed reviews
- leverages known order context (branch, delivery status, ownership)
- supports idempotent review updates cleanly

---

## UI Architecture Plan

### 3) New components
- `src/features/reviews/components/ReviewComposer.tsx`
  - star selector (1..5)
  - comment textarea
  - validation + loading + submit
- `src/features/reviews/components/ReviewCard.tsx`
  - wraps composer with eligibility and existing-state variants
- `src/features/reviews/components/ReviewSummaryInline.tsx`
  - shows submitted rating/comment snippet

### 4) Hooks/services
- `src/features/reviews/hooks/useOrderReviewEligibility.ts`
- `src/features/reviews/hooks/useSubmitRestaurantReview.ts`
- `src/features/reviews/hooks/useSubmitDeliveryReview.ts`
- API client wrappers under `src/services` or route-specific utility layer

### 5) API routes consumed from UI
- `GET /api/reviews/eligibility?orderId=...`
- `POST /api/reviews/restaurant`
- `POST /api/reviews/delivery`
- optional read endpoints for branch review list/aggregate

---

## Loading / Empty / Error States

### 6) Explicit states per card
- **Loading**: skeleton card with star placeholders.
- **Empty/Not eligible**: explanation text with reason code mapping.
- **Error**: inline warning + retry button.
- **Submitted**: summary state with edit action.

---

## Validation Rules (UI)

### 7) Form constraints
- `rating`: required, integer `1..5`
- `comment`: optional, trim whitespace, max length from API contract (recommended `500`)
- block submit while pending request
- preserve typed input on failed submit

Recommended stack:
- `react-hook-form` + `zod` schema for type-safe validation.

---

## Feature Flag / Visibility

### 8) Friends Activity hide flag
Already implemented:
- `NEXT_PUBLIC_HOME_FRIENDS_ACTIVITY`
- when set to `false`, hide Friends Activity section on home.

### 9) Optional review rollout flags (if needed)
- `NEXT_PUBLIC_REVIEWS_ENABLED=true`
- `NEXT_PUBLIC_DELIVERY_REVIEWS_ENABLED=true`

Default in development: enabled.

---

## Implementation Phases (UI)

### Phase 1 — Foundation
- add review types/interfaces
- add hooks + API integration layer
- add analytics event helpers

### Phase 2 — Order Detail write flow
- render restaurant review card
- render delivery review card (conditional)
- wire submit + edit + feedback states

### Phase 3 — Orders History entry
- show `Rate order` CTA for eligible completed orders
- deep link to detail review section

### Phase 4 — Restaurant read surfaces
- render aggregate rating/review count
- render recent review comments module

### Phase 5 — hardening
- improve accessibility (keyboard stars, labels)
- i18n keys for all new labels/errors
- analytics verification

---

## Testing Plan (UI)

### 10) Unit/component tests (Vitest + RTL)
- star selection and validation behavior
- submit success path updates UI state
- submit failure preserves input and shows retry
- ineligible states render correct fallback copy

### 11) Integration tests
- order detail loads eligibility and displays both cards correctly
- history CTA appears only for eligible completed orders
- edit flow updates existing review

### 12) Manual QA checklist
- completed pickup order (restaurant only)
- completed delivery order (restaurant + delivery)
- non-completed order (no submission)
- duplicate submit protection
- offline/retry behavior

---

## Dependencies on API repo
Before full UI rollout, API must deliver:
1. eligibility endpoint with reason codes
2. delivery review write endpoint with comment support
3. stable shape for existing review retrieval

## Release sequence
1. Deploy API migrations + endpoints
2. Deploy UI detail flow behind default-on config
3. Enable history CTA
4. Enable restaurant read surfaces
