# Fast Eat Client UI Component Library

This directory captures the reusable UI extracted from `resources/designs` and standardizes it into a component system that now exists both as documentation and as implementation-ready React components.

## Analysis Scope

Reviewed source mocks:

- `resources/designs/active_carts_overview.html`
- `resources/designs/ai_mystery_box_discovery.html`
- `resources/designs/ai_personal_meal_planner.html`
- `resources/designs/ai_search_discovery.html`
- `resources/designs/checkout_payment_summary.html`
- `resources/designs/create_account.html`
- `resources/designs/dietary_vault_preferences.html`
- `resources/designs/foodie_profile.html`
- `resources/designs/group_order_lobby.html`
- `resources/designs/login_screen.html`
- `resources/designs/main_home_screen.html`
- `resources/designs/menu_item_customization.html`
- `resources/designs/order_tracking_map.html`
- `resources/designs/restaurant_menu_details.html`
- `resources/designs/set_address.html`
- `resources/designs/split_the_bill_selection.html`
- `resources/designs/user_profile_settings.html`

The mocks vary in completeness, but all of them contribute reusable structures to the library.

## What This Structure Contains

- `foundations/`: tokens, visual rules, and styling recipes.
- `primitives/`: smallest reusable UI building blocks, with `.tsx` implementations.
- `composites/`: reusable business-facing components built from primitives, with `.tsx` implementations.
- `patterns/`: screen-level layout and navigation patterns, with `.tsx` implementations.
- `docs/`: inventory, screen mapping, and migration guidance.

Top-level implementation files:

- `index.ts`: barrel export for the resource component library.
- `utils.ts`: shared `cn` helper and common library types.

## Standardized UI Direction

The standardized system intentionally keeps the strongest parts of the mocks while removing inconsistency:

- Keep the warm orange brand accent.
- Replace zinc-vs-slate drift with one semantic neutral scale.
- Keep mobile-first dense commerce layouts.
- Normalize radii, shadows, form surfaces, icon sizes, and interactive states.
- Preserve Plus Jakarta Sans as the core product typeface for implementation continuity.
- Reserve display typography as an optional accent layer for campaigns, not default app chrome.

## Component Taxonomy

Primitives:

- Button
- Icon
- Badge
- Surface
- Form Controls

Composites:

- Section Header
- Rating Display
- Auth Shell
- Social Auth Button
- Sticky Header Bar
- Info Row
- Address Card
- Restaurant Card
- Menu Item Card
- Cart Card
- Promo Banner
- Quantity Selector
- Option Group
- Status Indicator

Patterns:

- App Shell
- Header and Navigation
- Horizontal Collections
- Bottom Action Bar
- Fixed Bottom Bar
- Empty State

## Behavior Standard

Every interactive component spec in this folder defines:

- Primary action
- Secondary action when relevant
- Fallback behavior
- User feedback expectations
- Tracking events

## Next Implementation Step

When this moves into `src`, treat this folder as the source library:

1. move foundations into the app theme layer
2. move primitives into `src/components/ui/primitives`
3. move composites and patterns into the app component system
4. replace route-specific markup with these shared pieces