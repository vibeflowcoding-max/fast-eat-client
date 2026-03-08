# Client Resources Component Library Implementation Plan

## Goal

Turn `resources/designs` into a real reusable component library under `resources/components`, replacing the current documentation-only scaffold with implementation-ready React components that can later be moved into `src` and wired into app flows.

## Design Analysis

Reviewed HTML design sources in `resources/designs`:

- `active_carts_overview.html`
- `ai_mystery_box_discovery.html`
- `ai_personal_meal_planner.html`
- `ai_search_discovery.html`
- `checkout_payment_summary.html`
- `create_account.html`
- `dietary_vault_preferences.html`
- `foodie_profile.html`
- `group_order_lobby.html`
- `login_screen.html`
- `main_home_screen.html`
- `menu_item_customization.html`
- `order_tracking_map.html`
- `restaurant_menu_details.html`
- `set_address.html`
- `split_the_bill_selection.html`
- `user_profile_settings.html`

Reviewed existing documentation scaffold in `resources/components`:

- `README.md`
- `docs/inventory.md`
- `docs/migration-plan.md`
- `primitives/*.md`
- `composites/*.md`
- `patterns/*.md`
- `foundations/*`

Key reusable patterns identified across the design set:

- sticky mobile headers with optional back/action controls
- app shell with reserved sticky and fixed chrome
- bottom tab navigation and fixed bottom CTA bars
- section headers with trailing actions
- horizontal discovery rails
- input fields with icon prefixes and optional suffix actions
- choice rows for radio, checkbox, and selectable cards
- menu item, restaurant, cart, and address cards
- status, info, and metric rows
- promo / campaign banners
- empty-state and progress/status modules

## Componentization Strategy

- Keep `resources/components/foundations` as the visual source of truth.
- Add actual `.tsx` component files beside the existing markdown specs.
- Use semantic props and slot-like React nodes rather than baking screen copy into primitives.
- Abstract only patterns that recur across multiple screens.
- Keep everything Tailwind-based and dependency-light so the library can be moved into `src` later with minimal changes.

## Tasks

- [x] Audit every HTML design and current component docs -> Verify: all reusable patterns are mapped into a concrete component inventory.
- [x] Create shared component utility and barrel exports in `resources/components` -> Verify: primitives/composites/patterns can share the same `cn` helper and exports.
- [x] Implement primitives from the documented scaffold -> Verify: button, icon, badge, surface, and form-control components exist as `.tsx` files.
- [x] Implement documented composites from the scaffold -> Verify: section header, restaurant card, cart card, promo banner, quantity selector, and option group exist as `.tsx` files.
- [x] Implement missing reusable composites discovered in the full audit -> Verify: sticky header bar, info row, address card, menu item card, rating display, and status indicator exist as `.tsx` files.
- [x] Implement reusable patterns from the design library -> Verify: app shell, header navigation, horizontal collections, bottom action bar, fixed bottom bar, and empty state exist as `.tsx` files.
- [x] Refresh resource documentation to reflect the full design audit and implemented component library -> Verify: `resources/components/README.md` and inventory docs reference real components and broader design coverage.
- [x] Validate the component files compile cleanly in the repo TypeScript program -> Verify: editor diagnostics on `resources/components` report no errors after the component files were added.

## Done When

- `resources/components` contains real reusable React components, not only markdown documentation.
- The component inventory reflects the full `resources/designs` library.
- The implemented files provide a stable base for a later `src` integration pass.

## Notes

- This pass does not wire the new components into live app routes.
- Components are intentionally designed to be reusable resource assets first, and integration targets second.