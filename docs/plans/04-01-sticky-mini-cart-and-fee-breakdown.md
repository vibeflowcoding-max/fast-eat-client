# Plan 04.01 — Sticky Mini-Cart and Fee Breakdown

## Objective

Improve checkout confidence and reduce abandonment by keeping total context visible and fee composition transparent.

## Scope

- Persistent mini-cart summary on eligible screens.
- Expandable fee breakdown panel before checkout confirmation.

## UX Specification

- Mini-cart bar shows:
  - item count
  - subtotal
  - estimated total
  - primary CTA (`View cart`/`Checkout`)
- Fee panel shows:
  - subtotal
  - delivery fee
  - service/platform fee
  - discount
  - final total

## Implementation Plan

1. Reuse cart store selectors to compute display values.
2. Add mini-cart component mounted at page shell level.
3. Add fee breakdown sheet with semantic row structure.
4. Sync wording with compare sheet terminology.

## Files

- `src/store.ts`
- `src/components` (cart-related UI)
- `src/features/home-discovery/components/PriceComparisonSheet.tsx`

## Analytics

- `mini_cart_impression`
- `mini_cart_open`
- `fee_breakdown_open`
- `checkout_cta_click`

## Testing

- Cart total consistency tests.
- Fee-row render tests with and without discounts.
- Mobile viewport interaction tests.

## Rollout

- Feature flag: `checkout_transparency_v1`.
- Start with returning users first.

## Definition of Done

- Mini-cart remains stable on target pages.
- Fee breakdown values match checkout final calculation.
- Checkout abandonment decreases or remains neutral.

## Implementation Checklist

- [ ] Align cart totals and fee model with checkout source of truth.
- [ ] Implement sticky mini-cart component and placement rules.
- [ ] Implement fee breakdown sheet with clear row labels.
- [ ] Add analytics for mini-cart and fee panel interactions.
- [ ] Add tests for fee row calculations and display consistency.
- [ ] Validate mobile viewport behavior and interaction accessibility.
- [ ] Roll out behind `checkout_transparency_v1`.
