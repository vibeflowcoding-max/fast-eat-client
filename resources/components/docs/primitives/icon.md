# Icon

## Purpose

Wraps the icon set behind a fixed sizing and semantic usage contract.

## Standard Sizes

- `xs`: 14px
- `sm`: 16px
- `md`: 20px
- `lg`: 24px

## Semantic Use

- navigation
- status
- metadata
- feedback
- decoration only inside already-labeled UI

## Rules

- Never use ad hoc icon sizes.
- Do not use icons as the only state signal for selected or destructive controls.
- Decorative icons should inherit text color.

## Behavior

- Primary action: none; icon becomes interactive only when wrapped by Button or another control.
- Fallback: if an icon asset is missing, render a safe default or hide the decorative icon.
- Tracking: not tracked alone unless interactive.