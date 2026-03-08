# Badge

## Purpose

Displays small pieces of categorized information such as promos, required labels, rating chips, counts, and status markers.

## Variants

- `promo`
- `soft`
- `rating`
- `required`
- `count`
- `danger`

## Rules

- Keep content short.
- Use pill shape for counts and rating chips.
- Use compact rounded rectangles for promo labels.

## Behavior

- Primary action: none by default.
- Secondary action: dismiss only when explicitly designed as removable filter chips.
- Fallback: hide empty badges instead of rendering placeholders.
- Tracking: `badge_impression` when used in promotional contexts.