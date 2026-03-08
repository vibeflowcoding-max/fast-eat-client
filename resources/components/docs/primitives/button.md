# Button

## Purpose

Used for all direct actions across discovery, cart, and customization flows.

## Variants

- `primary`: filled brand button for conversion-critical actions
- `secondary`: soft tinted action for lightweight tasks
- `ghost`: low-emphasis action used inside headers and cards
- `icon`: circular icon-only control

## Sizes

- `sm`: 36px min height
- `md`: 44px min height
- `lg`: 56px min height

## Anatomy

- Container
- Optional leading icon
- Label
- Optional trailing value or icon

## States

- default
- hover
- active
- focus-visible
- disabled
- loading

## Behavior

- Primary action: triggers the associated task immediately.
- Secondary action: optional paired action such as close, back, or save for later.
- Fallback: if action cannot run, show disabled state with explanatory text or a toast.
- Feedback: loading indicator for async work, success toast or route change on completion, inline error on failure.
- Tracking: `button_impression`, `button_click`, `button_success`, `button_error`.

## Usage Notes

- Use pill shape for bottom bars and high-priority mobile CTAs.
- Use icon buttons only with visible context or an accessible label.