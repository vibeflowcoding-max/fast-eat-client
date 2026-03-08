# Reusable Inventory

## Full Design Audit Coverage

All 17 HTML design files were reviewed. The resource library now captures reusable parts from both the fully built mocks and the lighter scaffolds.

## High-Reuse Structures Across The Design Set

- sticky mobile header bars with back/action affordances
- split auth shells with branded hero and mobile-first form stack
- app shells with reserved chrome space
- bottom tab navigation and fixed CTA bars
- section headers with trailing actions
- horizontal content rails and snap collections
- promo banners and campaign hero blocks
- restaurant, menu item, cart, and address cards
- field labels, input rows, textareas, and choice rows
- quantity controls
- info rows, status rows, and progress modules
- empty-state callouts

## Implemented Component Count

- 5 primitives
- 14 composites
- 6 patterns

## Implemented Primitives

- `button.tsx`
- `icon.tsx`
- `badge.tsx`
- `surface.tsx`
- `form-controls.tsx`

## Implemented Composites

- `section-header.tsx`
- `rating-display.tsx`
- `auth-shell.tsx`
- `social-auth-button.tsx`
- `sticky-header-bar.tsx`
- `info-row.tsx`
- `address-card.tsx`
- `restaurant-card.tsx`
- `menu-item-card.tsx`
- `cart-card.tsx`
- `promo-banner.tsx`
- `quantity-selector.tsx`
- `option-group.tsx`
- `status-indicator.tsx`

## Implemented Patterns

- `app-shell.tsx`
- `header-navigation.tsx`
- `horizontal-collections.tsx`
- `bottom-action-bar.tsx`
- `fixed-bottom-bar.tsx`
- `empty-state.tsx`

## Remaining Future-Specific Screen Modules

These can be assembled from the existing library first, and only then expanded with new components if real route needs justify it:

- group order participant lobby blocks
- map-tracking delivery overlays
- advanced checkout summary breakdowns
- AI recommendation-specific hero modules
- profile settings list sections with inline actions