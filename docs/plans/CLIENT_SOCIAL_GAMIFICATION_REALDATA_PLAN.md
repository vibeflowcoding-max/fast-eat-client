# Client Social, Content, and Gamification Real-Data Plan

## Objective

Replace runtime mock/static data in social/content/gamification surfaces with database-backed data providers and deterministic non-fake fallbacks.

## Reviewed Components

### `src/features/content/components/StoryMenuFeed.tsx`
- Uses `MOCK_STORIES` list as full runtime source.
- Includes static restaurant IDs, names, prices, and placeholder videos.

### `src/features/gamification/store/useLoyaltyStore.ts`
- Seeds user state with hardcoded points/streak/badges.
- Persisted local state can diverge from backend truth.

### `src/app/api/social/activity-caption/route.ts`
- Returns mock generated caption when AI key is missing.
- Text fallback is acceptable for UX, but must not imply fake entities beyond already real order payload.

### `src/features/home-discovery/components/DynamicPromoBanner.tsx`
- Uses local time-based promo text generation (mock “AI” behavior), not DB-driven active promotions.

## Target State

1. Story feed reads from DB-backed endpoint (`stories`/`menu_story_assets`/equivalent source).
2. Loyalty data hydrates from backend customer profile/gamification endpoint.
3. Promo banner displays real active promotions from DB (branch/context scoped).
4. Social caption fallback remains text-only and deterministic; no fake restaurant/item identities.

## Behavior-First Definitions

### Story Feed
- Primary action: open real item/restaurant from story card.
- Secondary action: mute/unmute and dismiss story overlay if applicable.
- Missing data fallback: hide module or show empty state CTA; no mock stories.
- Success feedback: story viewed/clicked events.
- Tracking: story_impression, story_play, story_click, story_complete.

### Loyalty Dashboard
- Primary action: show real points/streak/badges.
- Secondary action: close dashboard.
- Missing data fallback: loading skeleton -> explicit empty state.
- Tracking: loyalty_open, loyalty_close, badge_view.

### Dynamic Promo Banner
- Primary action: open promotions intent/filter.
- Secondary action: dismiss session banner.
- Missing data fallback: no banner.
- Tracking: impression, click, dismiss, conversion.

## Implementation Steps

### Step 1: Story data service
- Add endpoint `GET /api/content/stories` (or equivalent proxy) with branch/context filters.
- Replace `MOCK_STORIES` with fetched list + loading/error/empty states.

### Step 2: Loyalty sync
- Add/consume endpoint for points, streak, badges.
- Remove seeded mock initial state from store.
- Keep store as cache layer only.

### Step 3: Promo data source
- Replace local time rule generation with active promo query.
- Scope by branch, time window, and status.

### Step 4: Caption fallback policy
- Keep text fallback but ensure it uses only real request payload context.
- Add telemetry marker for provider-unavailable mode.

## Data Contracts Needed

### Story item
- `id`, `restaurantId`, `restaurantName`, `itemId`, `itemName`, `price`, `videoUrl`, `description`, `isActive`

### Loyalty profile
- `points`, `currentStreak`, `longestStreak`, `lastOrderDate`, `badges[]`

### Promo banner
- `promoId`, `title`, `subtitle`, `targetType`, `targetId`, `startsAt`, `endsAt`, `active`

## Verification Plan

- UI verification with browser tooling for render and click behavior.
- API verification that responses are DB-backed and contain no static seed entities.
- Empty-state verification when no rows exist.

## Done Criteria

- No mock stories in runtime.
- No seeded loyalty user values in runtime state initialization.
- Promo banner only appears with active DB-backed promotions.
- Social caption fallback is text-only and does not fabricate database entities.
