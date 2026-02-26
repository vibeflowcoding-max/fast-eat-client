# Favorites + Reviews Navigation Feature (fast-eat-client)

## Scope
Implement two signed-in customer features in `fast-eat-client`:
1. Reviews quick-access button in the top navbar (next to notifications/lightning).
2. Heart button to persist restaurant favorites in database.

## Supabase Analysis (MCP)
Using Supabase MCP inspection, we confirmed:
- Existing user/customer linkage is available via `customers.auth_user_id`.
- There is no existing table for saved/favorite restaurants.
- Existing related tables include `customers`, `customer_address`, `user_profiles`, and `user_dietary_profiles`.

Conclusion: a new table is required to persist favorites.

## Data Model Added
New table:
- `public.customer_favorite_restaurants`
  - `customer_id uuid not null` -> FK `customers(id)`
  - `restaurant_id uuid not null` -> FK `restaurants(id)`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - Primary key: `(customer_id, restaurant_id)`

Indexes:
- `(customer_id, created_at desc)`
- `(restaurant_id)`

Migration name used:
- `create_customer_favorite_restaurants`

## Signed-in Constraint
Favorites are signed-in only:
- API requires `Authorization: Bearer <access_token>`.
- Token is validated server-side with Supabase auth.
- Auth user is mapped to `customers` through `auth_user_id`.
- If a customer row does not exist yet, it is created automatically using auth metadata.

## API Surface
New route:
- `src/app/api/favorites/route.ts`

Methods:
- `GET /api/favorites?restaurantId=<id>` -> `{ isFavorite: boolean }`
- `GET /api/favorites` -> `{ favoriteRestaurantIds: string[] }`
- `POST /api/favorites` body `{ restaurantId }` -> set favorite
- `DELETE /api/favorites?restaurantId=<id>` -> remove favorite

## UI/Navigation Changes
### Navbar
File: `src/components/Navbar.tsx`
- Added reviews button:
  - Displays only `★ <avg>`.
  - If no rating: `N/D` (es) / `N/A` (en).
  - Opens dedicated reviews view.
- Added heart button:
  - Toggles favorite/unfavorite.
  - Persists state via `/api/favorites`.
  - Optimistic update with rollback on error.

### Dedicated reviews view
New route:
- `src/app/reviews/[branchId]/page.tsx`

Behavior:
- Opens from navbar rating button.
- Displays all reviews using existing reviews section component with higher fetch limit.
- Back button returns user to menu.

### Remove menu-page reviews block
File: `src/components/MainApp.tsx`
- Removed embedded reviews section from restaurant menu page.
- Added navigation callback to open dedicated reviews page.

## Existing Profile Integration
File: `src/app/api/customer/profile/route.ts`
- `favoriteRestaurants` now reads first from persisted `customer_favorite_restaurants`.
- If no persisted favorites exist, fallback remains historical order frequency.

## i18n Additions
Files:
- `src/messages/es-CR/messages.json`
- `src/messages/en-US/messages.json`

Added labels:
- Open reviews
- Add/remove favorite
- Rating fallback text
- Back to menu label for reviews page

## QA Checklist
1. Signed-in user opens restaurant menu.
2. Reviews button appears next to lightning, shows `★ avg`.
3. Tap reviews button opens `/reviews/[branchId]` and lists reviews.
4. Menu page no longer shows reviews section.
5. Heart toggle persists across refresh/session.
6. Profile endpoint returns persisted favorite restaurants.
7. Unauthorized requests to favorites API return `401`.
