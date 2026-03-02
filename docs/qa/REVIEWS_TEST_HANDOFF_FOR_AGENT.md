# Reviews Feature — Testing Handoff (UI + Client API Routes)

## Objective
Validate complete user-facing reviews flow in `fast-eat-client` for:
- Restaurant review (1..5 + comment)
- Delivery review (1..5 + comment)
- Order history CTA to rate completed orders
- Friends Activity env toggle

## Implemented Surfaces
- Orders history:
  - `src/app/orders/page.tsx` adds **Rate order** CTA linking to `orders/[orderId]#reviews`
- Order detail:
  - `src/app/orders/[orderId]/page.tsx` renders review section and both review cards
- New client API routes:
  - `GET /api/reviews/eligibility`
  - `POST /api/reviews/restaurant`
  - `POST /api/reviews/delivery`
- New review UI modules:
  - `src/features/reviews/components/*`
  - `src/features/reviews/hooks/*`

## Env Flags to Verify
In `.env`:
- `NEXT_PUBLIC_HOME_FRIENDS_ACTIVITY=false` hides Friends Activity
- `NEXT_PUBLIC_REVIEWS_ENABLED=true` enables review section on order detail
- `NEXT_PUBLIC_DELIVERY_REVIEWS_ENABLED=true` enables delivery review card

## Pre-Flight Data Requirements
For realistic E2E, ensure at least:
1. One completed order owned by a customer phone that can be loaded in app
2. Order has valid branch
3. (For delivery test) accepted delivery bid exists for that order

## Commands
From `fast-eat-client`:
- Unit test (new):
  - `pnpm test -- src/features/reviews/components/ReviewComposer.test.tsx`
- Build:
  - `pnpm build`

## UI Test Matrix

### A. Orders history page
1. Open `/orders`
2. In past/completed cards verify:
   - **Repeat order** still works
   - **Rate order** appears and navigates to detail `#reviews`

### B. Order detail review section
1. Navigate to `/orders/<validCompletedOrderId>#reviews`
2. Verify section header appears
3. Verify restaurant card appears
4. Verify delivery card behavior:
   - appears when delivery assignment exists
   - otherwise shows ineligible reason / unavailable state

### C. Submit behavior
1. Select star rating and add comment
2. Submit restaurant review
3. Verify success state shows summary and editable state
4. Repeat for delivery review when eligible

### D. Validation behavior
1. Try submit with long comment (>500)
2. Expected: error message, no crash, input preserved

### E. Fallback behavior
1. Non-completed order
   - review submit disabled
2. Missing phone/session context
   - clear actionable error

### F. Friends Activity flag
1. Set `NEXT_PUBLIC_HOME_FRIENDS_ACTIVITY=false`
2. Open home page `/`
3. Verify Activity Feed section is hidden
4. Set `true`; verify section appears again

## Route-Level Validation (Client API)
Use browser network panel or direct calls:
- `/api/reviews/eligibility?orderId=<uuid>&phone=<phone>`
  - verify `canReviewRestaurant`, `canReviewDelivery`, `existing`, `targets`
- `/api/reviews/restaurant` and `/api/reviews/delivery`
  - verify writes/updates reflected in eligibility response

## Regression Checks
- Order detail still loads bids/products/status blocks
- Home page still renders when Friends Activity hidden
- No console runtime errors while navigating orders pages

## Known Caveat During Local Mock Testing
- If order id is not a valid UUID, API will return UUID parse error.
- If data is insufficient (no matching phone/order), review section will stay in error/fallback state by design.

## Handoff Exit Criteria
- New unit test passes
- Build passes
- Manual matrix A–F passes with realistic seeded data
- No new critical console errors or API 500s in review flows
