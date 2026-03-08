# Client Resources Existing Screens Design Implementation Plan

Last updated: 2026-03-05

## 1. Objective

Apply the design system, component definitions, and screen mockups from `/resources` to the existing `fast-eat-client` screens only.

This plan explicitly excludes designs that do not currently have a real screen equivalent in the app or whose current route is not functionally equivalent to the mock.

## 2. Inputs Reviewed

### Resource design assets

- `resources/designs/main_home_screen.html`
- `resources/designs/menu_item_customization.html`
- `resources/designs/active_carts_overview.html`
- `resources/designs/restaurant_menu_details.html`
- `resources/designs/order_tracking_map.html`
- `resources/designs/user_profile_settings.html`
- `resources/designs/group_order_lobby.html`
- `resources/designs/ai_mystery_box_discovery.html`
- `resources/designs/ai_personal_meal_planner.html`
- `resources/designs/ai_search_discovery.html`
- `resources/designs/checkout_payment_summary.html`
- `resources/designs/dietary_vault_preferences.html`
- `resources/designs/split_the_bill_selection.html`

### Resource design-system documentation

- `resources/design_tokens.md`
- `resources/_design-system.scss`
- `resources/components/foundations/design-direction.md`
- `resources/components/foundations/component-recipes.md`
- `resources/components/foundations/tokens.css`
- `resources/components/foundations/tokens.json`
- `resources/components/docs/screen-map.md`
- `resources/components/docs/inventory.md`
- `resources/components/docs/migration-plan.md`

### Resource component definitions

#### Primitives

- `resources/components/primitives/button.md`
- `resources/components/primitives/icon.md`
- `resources/components/primitives/badge.md`
- `resources/components/primitives/surface.md`
- `resources/components/primitives/form-controls.md`

#### Composites

- `resources/components/composites/restaurant-card.md`
- `resources/components/composites/cart-card.md`
- `resources/components/composites/promo-banner.md`
- `resources/components/composites/option-group.md`
- `resources/components/composites/quantity-selector.md`
- `resources/components/composites/section-header.md`

#### Patterns

- `resources/components/patterns/app-shell.md`
- `resources/components/patterns/header-navigation.md`
- `resources/components/patterns/horizontal-collections.md`
- `resources/components/patterns/bottom-action-bar.md`

### Current app screens and entry points reviewed

- `src/app/page.tsx`
- `src/components/HomePage.tsx`
- `src/app/[slug]/page.tsx`
- `src/components/MainApp.tsx`
- `src/app/search/page.tsx`
- `src/components/SearchPageContent.tsx`
- `src/app/orders/page.tsx`
- `src/components/OrdersPageContent.tsx`
- `src/app/orders/[orderId]/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/reviews/[branchId]/page.tsx`
- `src/app/group/[sessionId]/page.tsx`

## 3. Current Reality Check

The `/resources` folder contains two kinds of inputs:

1. A reusable design system that should be applied broadly across existing screens.
2. A mixed set of screen mockups, where some map directly to current routes and others represent future or materially different flows.

The codebase currently has real route entry points for:

- home
- restaurant/menu detail (`[slug]`)
- search
- orders list
- order detail / tracking
- profile
- reviews
- auth sign-in and sign-up
- group join flow

Important scope corrections:

- `src/app/carts` exists as a folder but does not currently expose a `page.tsx`, so `active_carts_overview` is not an existing screen in production terms.
- `src/app/group/[sessionId]/page.tsx` is a join-and-redirect flow, not a lobby UI equivalent to `group_order_lobby.html`.
- `ai_search_discovery.html` is not a straightforward restyle of the current search screen; it implies expanded AI-first discovery behavior beyond simple visual migration.

## 4. Scope Decision Matrix

| Resource artifact | Existing app screen equivalent | Include in implementation scope | Notes |
| --- | --- | --- | --- |
| `main_home_screen.html` | Home (`src/app/page.tsx`, `src/components/HomePage.tsx`) | Yes | Direct match |
| `restaurant_menu_details.html` | Restaurant/menu screen (`src/app/[slug]/page.tsx`, `src/components/MainApp.tsx`) | Yes | Direct match |
| `menu_item_customization.html` | Item detail / customization flow inside `MainApp` | Yes | Direct match at modal/component level |
| `order_tracking_map.html` | Order detail (`src/app/orders/[orderId]/page.tsx`) | Yes | Direct match |
| `user_profile_settings.html` | Profile (`src/app/profile/page.tsx`) | Yes | Direct match |
| `active_carts_overview.html` | No current routed carts screen | No | Exclude until carts page exists |
| `group_order_lobby.html` | Current route is redirect-only join screen | No | Exclude until lobby UI exists |
| `ai_search_discovery.html` | Search route exists, but behavior does not match mock | Partial | Only adopt shared tokens/components, not full screen redesign |
| `ai_mystery_box_discovery.html` | No existing screen | No | Exclude |
| `ai_personal_meal_planner.html` | No existing screen | No | Exclude |
| `checkout_payment_summary.html` | No current screen equivalent confirmed | No | Exclude |
| `dietary_vault_preferences.html` | No current dedicated profile sub-screen | No | Exclude |
| `split_the_bill_selection.html` | No current screen equivalent confirmed | No | Exclude |

## 5. Design-System Decisions To Standardize First

These decisions should be implemented before screen-by-screen restyling begins.

### Theme and tokens

- Adopt `Plus Jakarta Sans` as the canonical UI font.
- Use the orange brand accent (`#ec5b13`) as the only global accent color.
- Replace ad hoc surface colors with a semantic surface ladder derived from the resources documentation.
- Keep promotional gradients isolated to promo modules, campaign banners, and discovery marketing surfaces.
- Normalize spacing, radius, border, and icon size scales from the resource tokens.

### Shared primitives to build or align

- Button
- Icon wrapper or size conventions
- Badge
- Surface / panel container
- Form controls

### Shared composites to build or align

- Promo banner
- Restaurant card
- Section header
- Option group
- Quantity selector
- Cart card

### Shared patterns to build or align

- App shell
- Header/navigation shell
- Horizontal rails / collections
- Bottom action bar

## 6. Screen-By-Screen Implementation Plan

### 6.1 Home / Discovery

#### Current entry points

- `src/app/page.tsx`
- `src/components/HomePage.tsx`

#### Resource inputs

- `resources/designs/main_home_screen.html`
- `resources/components/composites/promo-banner.md`
- `resources/components/composites/restaurant-card.md`
- `resources/components/composites/section-header.md`
- `resources/components/patterns/app-shell.md`
- `resources/components/patterns/header-navigation.md`
- `resources/components/patterns/horizontal-collections.md`

#### Current screen reality

The home screen already contains discovery rails, hero search, intent chips, dynamic promo content, and multiple content widgets. It is the best candidate for a direct migration to the new resource system because the current behavior already overlaps with the mock and component inventory.

#### Implementation work

- Replace one-off home card styling with standardized `RestaurantCard` variants.
- Standardize promo modules around a single `PromoBanner` API and visual recipe.
- Introduce a reusable `SectionHeader` contract for all rails and feed sections.
- Align header and bottom navigation chrome with the `app-shell` and `header-navigation` patterns.
- Normalize horizontal rail spacing, card width, snap behavior, and touch affordances.
- Apply token-based typography, spacing, border radius, shadows, and semantic surfaces.
- Keep advanced discovery widgets, but visually restyle them to fit the same system rather than leaving them as disconnected feature islands.

#### Behavior definition

- Primary actions: tap restaurant card to open restaurant; tap section CTA to open related collection; tap promo banner to open campaign destination.
- Secondary actions: dismissible banner behavior only if a banner explicitly supports dismissal.
- Fallbacks: if a rail has no data, show an empty state card or omit the rail according to product importance.
- Success/error feedback: search suggestions and data-driven widgets must expose loading and failure states without collapsing layout.
- Tracking: impression and click tracking for promo banners, restaurant rails, search suggestions, and high-priority discovery widgets.

#### Risks

- The home screen already contains multiple experiments and widgets. Styling changes must not break rail ranking, search suggestion behavior, or analytics.
- Avoid introducing multiple competing card systems during migration.

### 6.2 Restaurant / Menu Screen

#### Current entry points

- `src/app/[slug]/page.tsx`
- `src/components/MainApp.tsx`

#### Resource inputs

- `resources/designs/restaurant_menu_details.html`
- `resources/designs/menu_item_customization.html`
- `resources/components/composites/option-group.md`
- `resources/components/composites/quantity-selector.md`
- `resources/components/patterns/bottom-action-bar.md`
- `resources/components/primitives/form-controls.md`
- `resources/components/primitives/surface.md`

#### Current screen reality

`MainApp` is the central restaurant/menu experience. It already includes menu browsing, hero/navigation, item detail modal, cart modal, order actions, and location flows. The screen is functionally broad, so the design migration must happen by decomposing current UI into reusable patterns rather than attempting a full-page rewrite in one pass.

#### Implementation work

- Extract restaurant/menu header, metadata blocks, and major content sections into standardized surfaces and section headers.
- Rebuild item customization UIs around the documented `OptionGroup`, `QuantitySelector`, and `FormControls` primitives.
- Apply the `BottomActionBar` pattern to item add-to-cart and order summary actions where appropriate.
- Standardize hero and metadata spacing, price emphasis, badges, and sticky/fixed CTA treatments.
- Reduce custom styling inside `ItemDetailModal`, `CartModal`, and related menu subviews by moving shared structure into reusable UI components.
- Preserve current data and session logic while isolating purely presentational changes.

#### Behavior definition

- Primary actions: open item details, configure required/optional choices, adjust quantity, add to cart, open cart, place order.
- Secondary actions: close modal, clear cart, change branch, edit address.
- Fallbacks: if item options are missing, render a simplified item detail state; if branch/menu data is unavailable, keep current error and skeleton behavior.
- Success/error feedback: invalid required selections, sync failures, and order submission failures must remain explicit and accessible.
- Tracking: item detail open, modifier selection, quantity change, add-to-cart, cart open, checkout or place-order intent.

#### Risks

- `MainApp` is high-complexity and mixes data loading, session resolution, and view logic. The migration must avoid coupling visual components to branch/session state.
- Modal-heavy interactions need consistent focus handling and reduced-motion-safe transitions.

### 6.3 Search Screen

#### Current entry points

- `src/app/search/page.tsx`
- `src/components/SearchPageContent.tsx`

#### Resource inputs

- Shared design tokens and primitives
- Relevant home/search-adjacent cards and chips from the design system
- `ai_search_discovery.html` as inspiration only, not as a direct implementation contract

#### Current screen reality

The search screen already includes typed search, AI suggestions, recent searches, category filtering, and intent chips. The `ai_search_discovery` mock appears to imply a larger AI-first discovery experience than the current screen implements.

#### Implementation work

- Apply the standardized token layer, button styles, surface styles, chips, and typography.
- Align search form, AI suggestion chips, and result cards to the new primitive and composite contracts.
- Reuse the home-discovery card treatment where appropriate so search and home do not drift visually.
- Keep current IA and behavior unless the team separately approves expanding search into the full AI-first mock.

#### Behavior definition

- Primary actions: submit search, tap AI suggestion, tap category chip, tap intent chip, open restaurant result.
- Secondary actions: clear or replace the query where the current UI supports it.
- Fallbacks: if AI suggestions fail, keep search fully functional and show a quiet fallback message.
- Success/error feedback: loading and failure states should be localized to suggestions or results rather than blocking the full page.
- Tracking: search submit, suggestion impression, suggestion click, filter use, restaurant result click.

#### Scope boundary

- Do not treat `ai_search_discovery.html` as approval to add new search behaviors, new screens, or new data contracts.
- Limit this phase to visual alignment and component consistency on the existing screen.

### 6.4 Orders List

#### Current entry points

- `src/app/orders/page.tsx`
- `src/components/OrdersPageContent.tsx`

#### Resource inputs

- Shared tokens
- Badge, surface, and button primitives
- Section and card patterns from the broader system

#### Current screen reality

There is no exact dedicated resource mock for the orders list, but the screen is a real existing route and should be visually harmonized with the new system.

#### Implementation work

- Restyle order summary cards using the standardized surface, badge, and CTA treatment.
- Align page header, empty state, and action buttons to the shared primitives.
- Introduce stronger hierarchy for active vs past orders using consistent section headers and card recipes.
- Reuse semantic status badges and action affordances derived from the new design language.

#### Behavior definition

- Primary actions: open order detail, start ordering from empty state.
- Secondary actions: none beyond keyboard accessibility and card activation affordances.
- Fallbacks: preserve current empty, loading, and error states.
- Tracking: order card click, empty-state CTA click.

### 6.5 Order Detail / Tracking

#### Current entry point

- `src/app/orders/[orderId]/page.tsx`

#### Resource inputs

- `resources/designs/order_tracking_map.html`
- Shared surface, badge, button, and bottom action conventions

#### Current screen reality

The current order detail page already handles loading, order summary, bid information, review eligibility, and related status content. The mock should be applied carefully because the current page includes more operational content than a simple tracking map screen.

#### Implementation work

- Use the tracking mock to restyle the top summary, delivery status hierarchy, location/address blocks, and action sections.
- Apply a consistent card/surface treatment across status, pricing, restaurant, and review areas.
- Introduce semantic status badges and timeline or progress presentation where it improves readability without discarding current data.
- Keep review submission sections visually aligned with the broader design system.

#### Behavior definition

- Primary actions: navigate back, view status information, submit restaurant review, submit delivery review.
- Secondary actions: scroll to reviews from hash navigation and other existing affordances.
- Fallbacks: preserve current loading, not-found, and missing-customer-data handling.
- Success/error feedback: review submit success and failures must remain explicit; order loading failures stay page-visible.
- Tracking: order-detail view, review impression, review submit, review error.

#### Risks

- This screen combines tracking and review workflows. The visual redesign must not obscure review eligibility states or accepted-bid details.

### 6.6 Profile

#### Current entry point

- `src/app/profile/page.tsx`

#### Resource inputs

- `resources/designs/user_profile_settings.html`
- `resources/components/primitives/form-controls.md`
- `resources/components/primitives/surface.md`
- `resources/components/composites/section-header.md`

#### Current screen reality

The profile page already has account data, language settings, favorites, location editing, and dietary information references. The resource mock maps directly to this route and should be treated as a direct screen redesign.

#### Implementation work

- Reorganize profile sections into consistent panels and settings rows.
- Align editable fields, labels, helper text, and save feedback with the standardized form control and surface system.
- Improve information hierarchy for account identity, phone, address, favorites, locale, and dietary preferences already exposed in the current screen.
- Replace ad hoc feedback styling with shared success, warning, and error treatments.

#### Behavior definition

- Primary actions: edit and save profile, open address editor, change locale, open favorite restaurant.
- Secondary actions: dismiss transient success or helper feedback where relevant.
- Fallbacks: if unauthenticated or profile payload is missing, retain the current limited state with explicit messaging.
- Success/error feedback: profile save, location save, and language-setting feedback must remain immediate and visible.
- Tracking: profile view, save click, save success or failure, locale change, address edit open.

### 6.7 Reviews

#### Current entry point

- `src/app/reviews/[branchId]/page.tsx`

#### Resource inputs

- Shared tokens, surfaces, buttons, and section patterns

#### Current screen reality

No dedicated `/resources/designs` mock exists for the reviews screen, but it is an existing route and should not remain visually out of family after the resource migration.

#### Implementation work

- Apply shared layout, button, and panel primitives to the reviews route shell.
- Align review lists, headers, and controls to the same surface and typography system used in profile and order detail.
- Avoid building a bespoke review-only style system.

#### Behavior definition

- Primary actions: navigate back, read reviews, submit interactions already supported by child components.
- Fallbacks: preserve missing-branch and empty-review states.
- Tracking: route view and review interaction events where already supported.

## 7. Existing Screens Explicitly Excluded From Direct Mock Adoption

These existing or partially existing routes should not receive a one-to-one mock implementation from `/resources/designs` during this phase.

### Carts overview

- Reason: `src/app/carts` has no current `page.tsx`.
- Outcome: do not implement `active_carts_overview.html` yet.

### Group order lobby

- Reason: `src/app/group/[sessionId]/page.tsx` only joins the session and redirects home.
- Outcome: do not implement `group_order_lobby.html` until a real lobby screen exists.

### AI-first discovery screens

- Reason: `ai_mystery_box_discovery`, `ai_personal_meal_planner`, and related AI screens are concept-level additions, not simple restyles.
- Outcome: exclude from this plan.

### Checkout and split-bill mockups

- Reason: no confirmed equivalent routed screen was validated during this review.
- Outcome: exclude from this plan.

### Dietary vault preferences

- Reason: profile references dietary data, but there is no dedicated equivalent screen matching the mock.
- Outcome: exclude as a direct screen redesign for now.

## 8. Implementation Sequence

### Phase 1: Token and primitive foundation

- Add the semantic token layer to the app theme and global styles.
- Normalize typography, spacing, surfaces, borders, and core button treatments.
- Create or align shared primitives under the existing UI structure.

### Phase 2: Composite components

- Build or normalize `PromoBanner`, `RestaurantCard`, `SectionHeader`, `OptionGroup`, `QuantitySelector`, and status-oriented card variants.
- Replace home, menu, profile, and order-detail one-offs with the shared composite layer.

### Phase 3: Direct-match screens

- Home
- Restaurant/menu
- Item customization
- Order detail / tracking
- Profile

These should be the first full screen migrations because they have the strongest resource-to-route mapping.

### Phase 4: System alignment for adjacent existing screens

- Search
- Orders list
- Reviews
- Auth shells if visual drift remains after token adoption

These screens should inherit the system without expanding their product scope.

### Phase 5: Cleanup and verification

- Remove duplicate styling patterns that the new system replaces.
- Ensure loading, error, and empty states are present for every data-driven section.
- Validate accessibility, responsiveness, and reduced-motion behavior.

## 9. Likely Code Areas To Modify During Implementation

### App theme and styles

- `src/app/globals.css`
- any shared typography or theme utilities already in use

### Shared UI layer

- shared component directories under `src/components` and feature UI areas
- likely new standardized component files for primitives, composites, and patterns

### Home

- `src/components/HomePage.tsx`
- discovery feature components under `src/features/home-discovery/components`

### Restaurant / menu

- `src/components/MainApp.tsx`
- `src/components/ItemDetailModal*`
- `src/components/CartModal*`
- hero/navbar/menu presentation components

### Search

- `src/components/SearchPageContent.tsx`

### Orders

- `src/components/OrdersPageContent.tsx`
- `src/app/orders/[orderId]/page.tsx`

### Profile and reviews

- `src/app/profile/page.tsx`
- `src/app/reviews/[branchId]/page.tsx`
- related review/profile child components

## 10. Verification Plan For Implementation Phase

When implementation begins, verification should be mandatory for each migrated screen.

### Browser validation

- Validate each updated screen with Chrome DevTools MCP after implementation.
- Confirm responsive behavior on mobile-first widths and larger breakpoints.
- Confirm sticky headers and bottom bars respect safe-area spacing.
- Confirm touch targets remain at least 44px.

### State validation

- Loading state
- Error state
- Empty state
- Auth-limited state where applicable
- Reduced-motion behavior

### Accessibility validation

- Keyboard focus visibility
- Tab order for cards, controls, and CTAs
- Proper labels and help text for form fields
- Clear selected and invalid states for option groups and inputs

### Regression protection

- Add or update Vitest and RTL coverage for new shared UI logic and critical interaction states.
- Prefer behavior tests over styling snapshot tests.

## 11. Delivery Strategy Recommendation

Use a system-first migration, not a screen-by-screen patchwork approach.

Recommended order:

1. Tokens and primitives
2. Home composites and rails
3. Restaurant/menu and item customization
4. Profile and order detail
5. Orders list, search, reviews

This order minimizes duplicated styling work, reduces drift between screens, and allows the most reusable screens to define the system before secondary pages are updated.

## 12. Final Scope Summary

### In scope for direct design adoption

- Home
- Restaurant/menu detail
- Item customization flows
- Order detail / tracking
- Profile

### In scope for shared-system alignment only

- Search
- Orders list
- Reviews
- Auth shells if needed after token rollout

### Out of scope for this phase

- Active carts overview
- Group order lobby
- AI mystery box discovery
- AI personal meal planner
- Full AI search redesign beyond visual alignment
- Checkout payment summary
- Dietary vault preferences as a dedicated screen
- Split-the-bill selection

This plan gives the team a safe implementation boundary: apply the new resource system aggressively where a real route already exists, but do not convert placeholder or concept designs into product scope by accident.