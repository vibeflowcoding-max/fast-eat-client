# Unstaged Functional Changes Handoff (2026-02-26)

This document captures **functional changes only** from the **current unstaged files** in `fast-eat-client`.

- Included: behavior, data flow, API contracts, validation rules, navigation logic, feature wiring.
- Excluded: pure CSS/className visual restyling and layout polish.

Use this as a re-implementation handoff if the working tree is discarded.

---

## 1) Customer Identity + Favorites Persistence

### File: `src/app/api/customer/_lib.ts`
Added helper:
- `ensureCustomerByAuthUser({ authUserId, email?, fullName? })`

Behavior:
1. Validates non-empty `authUserId`.
2. Looks up `customers` by `auth_user_id`.
3. If found, returns `{ customerId }`.
4. If not found, inserts a new `customers` row with:
	- `auth_user_id`
	- optional `email`
	- optional `name` (from `fullName`)
5. Returns created `customerId`.
6. Throws explicit error if create fails.

Why it matters:
- Enables API routes that authenticate via Supabase Auth token to resolve/create the `customers` record automatically.

---

### File: `src/app/api/customer/profile/route.ts`
Changed favorite restaurant sourcing logic in `GET`:

Previous behavior:
- Derived favorites only from order frequency (`orders_with_details`).

Current behavior:
1. Loads persisted favorites from `customer_favorite_restaurants` ordered by `created_at desc`.
2. Uses persisted IDs first (`slice(0,6)`).
3. Fallback to frequency from recent orders only when persisted favorites are empty.
4. Resolves top IDs to restaurant entities (`id,name,logo_url`) and preserves ranking order.

Why it matters:
- Profile favorites now reflect explicit customer intent (heart/favorite action), not only heuristic history.

---

## 2) Order Detail Data Enrichment for Reviews

### File: `src/app/api/orders/[orderId]/route.ts`
Added response data needed by review workflows:

Query changes:
- `orders` select now includes `branch_id`.
- `delivery_bids` select now includes `driver_id`.

Response enrichments:
- Bid objects now include `driverId`.
- Top-level `order.branchId` added.
- Top-level `order.acceptedDeliveryBid` added:
  - Picks first bid where `acceptedAt` exists or status in `accepted|delivering`.
  - Shape: `{ id, driverId } | null`.

Why it matters:
- Frontend can submit restaurant review with correct `branchId` and delivery review with chosen delivery assignment context.

---

## 3) Restaurant Review Data Model Alignment (Branch-based)

### File: `src/app/api/restaurants/[restaurantId]/reviews/route.ts`
Write path updated from restaurant-level to branch-level review table.

Validation flow:
1. Fetch order by `id` (no direct `restaurant_id` filter now).
2. Resolve order branch via `order.branch_id` and verify that branch belongs to target `restaurantId`.
3. Reject with `400` if branch does not belong to restaurant.

Storage changes:
- Writes to `branch_reviews` instead of `restaurant_reviews`.
- Payload uses `branch_id` instead of `restaurant_id`.
- Selected return columns updated to branch-based schema.

Why it matters:
- Aligns writes with existing branch-centric review domain and avoids mismatches between order/restaurant linkage.

---

## 4) Restaurant Listing Ratings from Real Reviews

### File: `src/app/api/restaurants/route.ts`
Restaurant and branch ratings/counts are now derived from real review rows (`branch_reviews`) instead of trusting static fields alone.

New logic:
1. Fetch `branch_reviews(branch_id,rating)` for all visible branches.
2. Aggregate per branch:
	- `reviewCount`
	- `avgRating` (`ratingSum / ratingCount`)
3. Override branch metrics in transformed output:
	- `branch.rating`
	- `branch.review_count`
4. Derive restaurant-level metrics from branch-level aggregates and normalize:
	- `restaurant.rating` rounded to 2 decimals or `null`
	- `restaurant.review_count` as integer (0 minimum)

Why it matters:
- Home/search surfaces now show dynamic review stats based on actual submitted reviews.

---

## 5) New Favorites API Route (Auth Required)

### File: `src/app/api/favorites/route.ts` (new)
Dynamic route with Bearer-token auth using Supabase.

Auth resolution:
1. Parse `Authorization: Bearer <token>`.
2. `supabaseServer.auth.getUser(token)`.
3. Resolve/create customer via `ensureCustomerByAuthUser`.

Endpoints:

#### `GET /api/favorites?restaurantId=<id>`
- Returns `{ isFavorite: boolean }` for current customer.

#### `GET /api/favorites`
- Returns `{ favoriteRestaurantIds: string[] }` ordered by creation desc.

#### `POST /api/favorites`
Body:
- `{ restaurantId: string }`

Behavior:
- Idempotent set favorite (checks existing first).
- Inserts `customer_id`, `restaurant_id`, `updated_at` if missing.
- Returns `{ success: true, isFavorite: true }`.

#### `DELETE /api/favorites?restaurantId=<id>`
- Deletes favorite relation for authenticated customer.
- Returns `{ success: true, isFavorite: false }`.

Error behavior:
- `401` for missing/invalid token (`Missing Authorization header` or `Unauthorized`).
- `400` when required params/body missing.
- `500` for unexpected DB/server failures.

---

## 6) New Branch Reviews Read API

### File: `src/app/api/branches/[branchId]/reviews/route.ts` (new)
Read endpoint for aggregated restaurant review summary + recent comments.

Input:
- Route param: `branchId`
- Query param: `limit` parsed with bounds
  - default `6`
  - max `20`

Behavior:
1. Resolve current branch and restaurant.
2. Load all active branches of that restaurant.
3. Aggregate across those branch IDs:
	- exact review count (`branch_reviews`)
	- average rating from non-null ratings
	- recent non-empty comments (ordered desc, limited)
4. Return normalized response:

```json
{
  "summary": {
	 "restaurantId": "...",
	 "restaurantName": "...",
	 "avgRating": 4.35,
	 "reviewCount": 123
  },
  "reviews": [
	 {
		"id": "...",
		"branchId": "...",
		"branchName": "...",
		"rating": 5,
		"comment": "...",
		"createdAt": "..."
	 }
  ]
}
```

---

## 7) New Reviews Write/Eligibility API Surface

### File: `src/app/api/reviews/eligibility/route.ts` (new)
`GET /api/reviews/eligibility?orderId=...&phone=...`

Behavior:
1. Resolves customer by phone.
2. Loads order ownership + status.
3. Loads branch target (`orders.branch_id`).
4. Loads existing restaurant review (`branch_reviews`) and delivery review (`delivery_reviews`).
5. Loads accepted delivery bid candidate.
6. Returns capability flags + reason codes + targets + existing reviews:
	- `canReviewRestaurant`
	- `canReviewDelivery`
	- `reasons.restaurant|delivery`
	- `existing.restaurant|delivery`
	- `targets.branchId|driverId|acceptedBidId`

Reason codes emitted:
- `order_not_completed`
- `delivery_assignment_not_found`

---

### File: `src/app/api/reviews/restaurant/route.ts` (new)
`POST /api/reviews/restaurant`

Body:
- `orderId`, `phone`, `branchId`, `rating`, optional `comment`

Validation:
- `rating` integer in `1..5`
- order belongs to customer (phone->customer)
- order status is `COMPLETED` or `DELIVERED`
- `branchId` must match `orders.branch_id`
- comment trimmed, max 500 chars

Write:
- Upsert into `branch_reviews` on `order_id`.

---

### File: `src/app/api/reviews/delivery/route.ts` (new)
`POST /api/reviews/delivery`

Body:
- `orderId`, `phone`, `rating`, optional `comment`, optional `driverId`, optional `deliveryBidId`

Validation:
- `rating` integer in `1..5`
- order belongs to customer
- order completed/delivered
- accepted delivery assignment must exist (`delivery_bids`)
- comment max 500 chars

Write:
- Upsert into `delivery_reviews` on `order_id,customer_id`.
- If `driverId` / `deliveryBidId` omitted, derives from accepted bid.

---

## 8) Reviews UI Feature Modules (New)

### Types
File: `src/features/reviews/types.ts`
- `ExistingReview`
- `ReviewEligibility`
- `ReviewSubmitPayload`

### Hooks
Files:
- `src/features/reviews/hooks/useOrderReviewEligibility.ts`
- `src/features/reviews/hooks/useSubmitRestaurantReview.ts`
- `src/features/reviews/hooks/useSubmitDeliveryReview.ts`

Behavior:
- Encapsulate fetch/mutation for review APIs.
- Standardized local state: `loading/submitting`, `error`, `refresh`.

### Components
Files:
- `src/features/reviews/components/ReviewComposer.tsx`
- `src/features/reviews/components/ReviewCard.tsx`
- `src/features/reviews/components/ReviewSummaryInline.tsx`

Behavior:
- `ReviewComposer`: 1–5 rating, comment input (max 500), submit/dismiss, disabled reason handling.
- `ReviewCard`: renders existing summary + composer; supports session dismiss for non-existing review.
- `ReviewSummaryInline`: displays current saved review snapshot.

### Test
File: `src/features/reviews/components/ReviewComposer.test.tsx`
- Verifies submit payload carries chosen rating/comment.
- Verifies submit disabled under ineligible state.

---

## 9) Order Screens Integration

### File: `src/app/orders/[orderId]/page.tsx`
Functional additions:
1. Imports and wires review hooks/components.
2. Feature flags:
	- `NEXT_PUBLIC_REVIEWS_ENABLED`
	- `NEXT_PUBLIC_DELIVERY_REVIEWS_ENABLED`
3. Loads eligibility for current order+phone.
4. Supports deep-link `#reviews` auto-scroll.
5. Adds restaurant review submit flow:
	- requires `fromNumber` and `order.branchId`.
6. Adds delivery review submit flow:
	- uses eligibility targets `driverId` and `acceptedBidId`.
7. Refreshes eligibility after successful submits.

---

### File: `src/app/orders/page.tsx`
Functional changes:
1. Preserves existing orders data fetch and error handling.
2. Adds explicit **Rate order** action in past order cards:
	- routes to `/orders/${order.id}#reviews`.
3. Keeps **Repeat order** action intact.

Note:
- Most remaining changes in this file are visual restyling.

---

## 10) MainApp + Navbar Functional Wiring

### File: `src/components/MainApp.tsx`
Added behavior (non-style):
1. Category section model (`categorySections`) derived from full menu when not searching.
2. Scroll-sync effect updates active tab based on section currently in viewport.
3. Category click now scrolls to corresponding section (or top for `Todos`) when not in search mode.
4. Navbar callbacks added:
	- `onOpenReviews` -> navigate to `/reviews/[branchId]`
	- `onGoBack` -> `router.back()` when possible, fallback `/`
5. Rendering mode split:
	- With search query: flat filtered items.
	- Without search query: grouped-by-category section rendering.

---

### File: `src/components/Navbar.tsx`
Added behavior (non-style):
1. New props:
	- `onOpenReviews`
	- `onGoBack`
2. Favorite state handling for active restaurant:
	- Reads auth session token.
	- Loads existing favorite state via `GET /api/favorites?restaurantId=...`.
	- Toggle favorite with optimistic UI:
	  - `POST /api/favorites` to add
	  - `DELETE /api/favorites?restaurantId=...` to remove
	- Rollback on failure.
3. Rating display fallback logic:
	- shows formatted rating when >0
	- otherwise i18n fallback (`N/D` / `N/A`).
4. New actions exposed in navbar:
	- back navigation button (`onGoBack`)
	- open reviews button (`onOpenReviews`)
	- favorite toggle button.

---

## 11) Dedicated Restaurant Reviews Screen

### File: `src/app/reviews/[branchId]/page.tsx` (new)
Behavior:
- Dedicated page to read restaurant comments.
- Reads `branchId` from route params.
- Back action via `router.back()`.
- Renders `RestaurantReviewsSection` with high limit (`50`).

### File: `src/components/RestaurantReviewsSection.tsx` (new)
Behavior:
- Fetches `/api/branches/${branchId}/reviews?limit=...`.
- Handles `loading`, `error`, and `empty` states.
- Displays summary average + count + comment list.

---

## 12) Other Non-style Unstaged Functional Tweaks

### File: `src/components/LoadingScreen.tsx`
- Added `'use client'` directive.
- Makes component explicitly client-rendered (required because it uses `useTranslations` hook in client context).

### File: `src/components/CategoryBar.tsx`
Non-style logic additions:
- Added `CATEGORY_ICON_OVERRIDES` for normalized category names:
  - `colombiana` -> Colombia flag emoji
  - `cubana` -> Cuba flag emoji
- Added `getCategoryIcon()` to apply override before fallback to existing icon/default.

### File: `src/components/ChatWidget.tsx`
- Initial assistant greeting text changed from themed “Chef Zen/Konichiwa” copy to neutral “Hola...” copy.

### File: `next-env.d.ts`
- Path changed from `.next/types/routes.d.ts` to `.next/dev/types/routes.d.ts`.
- This is tooling-generated and typically should **not** be treated as business logic.

---

## 13) Reimplementation Checklist (Functional Only)

If recreating from scratch, implement in this order:

1. Add `ensureCustomerByAuthUser` in customer API lib.
2. Add `customer_favorite_restaurants`-aware behavior in profile API.
3. Add `/api/favorites` with Bearer auth and idempotent add/remove.
4. Add branch-based review endpoints:
	- `/api/reviews/eligibility`
	- `/api/reviews/restaurant`
	- `/api/reviews/delivery`
5. Add branch reviews read endpoint `/api/branches/[branchId]/reviews`.
6. Enrich `/api/orders/[orderId]` with `branchId` + accepted bid payload.
7. Update `/api/restaurants/[restaurantId]/reviews` to write `branch_reviews`.
8. Update `/api/restaurants` to derive ratings/counts from `branch_reviews`.
9. Add reviews module (`types`, hooks, components, tests).
10. Wire reviews into:
	 - order detail page (`#reviews` section + submit flows)
	 - order history page (`Rate order` deep link)
11. Add dedicated reviews page + `RestaurantReviewsSection`.
12. Wire MainApp/Navbar navigation and favorite controls.

---

## 14) Known Dependencies / Preconditions

Backend/data assumptions used by this implementation:
- Tables/views exist and are queryable:
  - `customers`
  - `customer_favorite_restaurants`
  - `orders`
  - `orders_with_details`
  - `branches`
  - `restaurants`
  - `branch_reviews`
  - `delivery_bids`
  - `delivery_reviews`
- Supabase auth session token available client-side for favorites endpoint calls.

If any of these are missing, the feature must include schema/migration setup first.

