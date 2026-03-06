# Fast Eat Client UI System Scaffold

This directory captures the reusable UI extracted from `resources/designs` and standardizes it into a component system that can be implemented later in the app.

## Analysis Scope

Reviewed source mocks:

- `resources/designs/main_home_screen.html`
- `resources/designs/menu_item_customization.html`
- `resources/designs/active_carts_overview.html`

Files currently acting as placeholders with no reusable markup yet:

- `resources/designs/ai_mystery_box_discovery.html`
- `resources/designs/ai_personal_meal_planner.html`
- `resources/designs/ai_search_discovery.html`
- `resources/designs/checkout_payment_summary.html`
- `resources/designs/dietary_vault_preferences.html`
- `resources/designs/group_order_lobby.html`
- `resources/designs/order_tracking_map.html`
- `resources/designs/restaurant_menu_details.html`
- `resources/designs/split_the_bill_selection.html`
- `resources/designs/user_profile_settings.html`

## What This Structure Contains

- `foundations/`: tokens, visual rules, and styling recipes.
- `primitives/`: smallest reusable UI building blocks.
- `composites/`: reusable business-facing components built from primitives.
- `patterns/`: screen-level layout and navigation patterns.
- `docs/`: inventory, screen mapping, and migration guidance.

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
- Restaurant Card
- Cart Card
- Promo Banner
- Quantity Selector
- Option Group

Patterns:

- App Shell
- Header and Navigation
- Horizontal Collections
- Bottom Action Bar

## Behavior Standard

Every interactive component spec in this folder defines:

- Primary action
- Secondary action when relevant
- Fallback behavior
- User feedback expectations
- Tracking events

## Next Implementation Step

When this moves into `src`, implement foundations first, then primitives, then composites, then patterns.