# Quantity Selector

## Purpose

Adjusts item quantity inside product detail and cart contexts.

## Anatomy

- Decrease button
- Current value
- Increase button

## Behavior

- Primary action: increase or decrease quantity by one step.
- Secondary action: long-press acceleration may be added later.
- Fallback: if minimum or maximum is reached, disable the relevant control.
- Feedback: immediate value update; shake or inline message on inventory limits.
- Tracking: `quantity_increment`, `quantity_decrement`, `quantity_limit_hit`.