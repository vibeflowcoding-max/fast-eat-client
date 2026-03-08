# Cart Card

## Purpose

Represents an active cart entry with a direct route into checkout.

## Anatomy

- Thumbnail
- Cart title
- Item count
- Total price
- Inline CTA row

## Behavior

- Primary action: whole card opens the saved cart or checkout continuation.
- Secondary action: future overflow menu may support delete or save-for-later.
- Fallback: if thumbnail is missing, render surface placeholder; if totals are stale, show a recalc state before proceeding.
- Feedback: hover and press reinforce border and title color; failed checkout route shows inline or toast error.
- Tracking: `cart_card_impression`, `cart_card_click`, `cart_checkout_click`.

## Normalization Notes

- Use the same neutral palette as the rest of the app instead of zinc-only surfaces.