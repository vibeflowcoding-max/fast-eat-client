# Surface

## Purpose

Defines the shared container treatment for cards, sheets, bars, and nested blocks.

## Variants

- `base`
- `raised`
- `muted`
- `inverse-base`
- `inverse-raised`
- `glass`

## Rules

- Surfaces own background, border, radius, and shadow.
- Content components should not redefine those tokens unless a variant requires it.
- Use glass only for sticky or floating chrome, not for full cards.

## Behavior

- Primary action: none.
- Fallback: downgrade to `base` if blur support or theme context is unavailable.