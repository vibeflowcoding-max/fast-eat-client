# Restaurant Card

## Purpose

Primary browse card for discovery rails and list screens.

## Anatomy

- Hero image
- Delivery ETA badge
- Optional promo badge
- Favorite toggle
- Restaurant title
- Rating chip
- Cuisine and price tier metadata
- Delivery fee metadata

## Variants

- `default`
- `promo`
- `compact`

## Behavior

- Primary action: whole card opens restaurant details.
- Secondary action: favorite toggle saves or removes the restaurant.
- Fallback: if image is unavailable, render branded placeholder surface; if rating is missing, hide chip; if delivery metadata is missing, collapse the row.
- Feedback: favorite state toggles immediately; errors revert state and surface a toast.
- Tracking: `restaurant_card_impression`, `restaurant_card_click`, `restaurant_favorite_click`, `restaurant_card_conversion`.

## Normalization Notes

- Promo badge placement should always be top-left.
- Favorite button should always be top-right.
- Rating chip uses one consistent background recipe.