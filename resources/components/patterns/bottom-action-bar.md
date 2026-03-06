# Bottom Action Bar

## Purpose

Anchors high-intent actions such as `Add to Cart` and future checkout shortcuts.

## Anatomy

- Fixed container
- Optional supporting control such as quantity selector
- Primary CTA

## Behavior

- Primary action: execute the main conversion step.
- Secondary action: adjust a supporting value such as quantity.
- Fallback: if item data is incomplete, disable the CTA and explain why.
- Feedback: sticky visibility, strong CTA state, loading lock while submitting.
- Tracking: `bottom_bar_impression`, `bottom_bar_primary_click`, `bottom_bar_secondary_click`, `bottom_bar_conversion`.

## Rules

- Reserve bottom safe area.
- Keep total height stable.
- Use floating shadow and border separation.