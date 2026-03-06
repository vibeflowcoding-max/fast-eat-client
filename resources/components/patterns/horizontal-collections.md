# Horizontal Collections

## Purpose

Standardizes scrollable promo rails and restaurant discovery rows.

## Anatomy

- Section header
- Scroll container
- Snap points
- Reusable card items

## Behavior

- Primary action: each card opens its destination.
- Secondary action: optional `See all` opens a vertical list.
- Fallback: if the collection is empty, replace with a purposeful empty state instead of blank space.
- Feedback: scroll snapping, visible affordance that more content exists, skeleton loading when data is pending.
- Tracking: `collection_impression`, `collection_scroll`, `collection_item_click`, `collection_see_all_click`.

## Rules

- Hide native scrollbar only if swipe discoverability remains strong.
- Use a consistent gap and card width recipe.
- Avoid mixing card types in one rail unless the section is intentionally mixed-media.