# Plan 01.02 — Restaurant Card Modernization

## Objective

Increase confidence and click-through by making restaurant cards clearer, richer, and visually consistent without increasing cognitive load.

## Scope

- Improve card information architecture: image, badges, metadata, CTA.
- Improve visual polish: spacing, typographic emphasis, fallback image behavior.
- Maintain compatibility with current rail and compare flows.

## UX Specification

- Top area: image with stable ratio and graceful fallback.
- Badge row: promo + ETA priority badges.
- Metadata row: final price estimate, delivery fee hint, rating confidence.
- CTA remains one clear primary interaction.

## Implementation Plan

### Step 1 — Card content model alignment

- Ensure card receives/derives:
  - `etaMinutes`
  - `finalPriceEstimate`
  - `hasPromo`
  - `rating` and `reviewConfidence`

### Step 2 — UI composition refactor

- Split card into internal sections (`media`, `meta`, `actions`) for maintainability.
- Keep touch targets minimum 44px where applicable.

### Step 3 — Fallback behavior hardening

- Use `placeholder-restaurant.svg` and prevent fallback loops.
- Ensure graceful rendering if image URL is invalid/slow.

### Step 4 — Interaction polish

- Add subtle hover/press state with reduced-motion-safe transitions.
- Keep keyboard focus styles visible and consistent.

## Files

- `src/components/RestaurantCard.tsx`
- `public/placeholder-restaurant.svg`

## Analytics

- Validate impact on `rail_item_click` rank distribution.
- Track promo-badge card CTR delta vs non-promo cards.

## Accessibility

- Verify image alt text quality.
- Ensure badges don’t rely on color only.
- Ensure card CTA is keyboard reachable and labeled.

## Testing

- Component rendering tests for:
  - with promo
  - without promo
  - missing image
  - missing rating count
- Existing keyboard interaction tests remain green.

## Rollout

- Card v2 is now default (legacy card removed).
- Monitor CTR and add-to-cart downstream after rollout.

## Risks & Mitigations

- Risk: over-dense card layout.
  - Mitigation: strict content truncation and visual hierarchy.
- Risk: CLS from image load.
  - Mitigation: fixed image container ratio.

## Definition of Done

- Card v2 shipped as default implementation.
- No a11y regressions.
- Positive or neutral CTR impact.

## Implementation Checklist

- [x] Finalize card content priorities (ETA, price, promo, rating confidence).
- [x] Refactor card into stable media/meta/action sections.
- [x] Improve fallback image behavior and loop protection.
- [x] Add reduced-motion-safe interaction states.
- [x] Add tests for promo/no-promo/missing-image/missing-rating cases.
- [x] Run keyboard and focus behavior tests.
- [ ] Measure CTR impact in canary cohort.
- [x] Remove legacy card and keep modern card as default.
