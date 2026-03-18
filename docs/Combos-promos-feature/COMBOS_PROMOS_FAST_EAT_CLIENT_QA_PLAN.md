# Combos And Promos Fast-Eat-Client QA Plan

## Related Documents

- implementation scope: `COMBOS_PROMOS_FAST_EAT_CLIENT_PLAN.md`
- restaurant-app validation: `..\..\..\restaurant-partner-p\docs\Combos-promos-feature\COMBOS_PROMOS_QA_PLAN.md`
- backend validation: `..\..\..\fast-eat-api-nestjs\docs\Combos-promos-feature\COMBOS_PROMOS_API_QA_PLAN.md`

## 1. Scope

This document defines consumer-app testing for combos and promos in `fast-eat-client`.

It covers:

- branch menu discovery
- cart and checkout pricing behavior
- promo-code validation and invalidation states
- order confirmation and history snapshot rendering

## 2. Validation Goals

The client release must verify:

1. active combos appear only in the intended branch menu surfaces
2. combo cards show truthful pricing, savings, and availability state
3. combo cart lines behave differently from ordinary item lines where required
4. promo validation feedback is clear for valid, invalid, expired, paused, and branch-mismatched codes
5. checkout totals stay in sync with backend validation results
6. historical confirmation screens preserve the applied offer snapshot even after source-offer edits
7. mixed carts and blocked stacking paths never show duplicate savings

## 3. Test Case Convention

Recommended ids:

- `CAPP-*` for app validation
- `CHK-*` for checkout pricing and promo validation
- `ORD-*` for post-checkout confirmation and history rendering

Each test case should record:

- status
- environment
- tester
- date
- result notes

Recommended statuses:

- `not-started`
- `in-progress`
- `blocked`
- `passed`
- `failed`

## 3.1 Execution Priority

Run in this order:

1. checkout pricing and promo validation
2. cart and store behavior for combo lines
3. branch menu discovery and combo rendering
4. confirmation and history snapshot rendering
5. stacking and invalidation recovery flows

## 3.2 Current Automated Coverage Map

Current client suites that are directly or adjacently useful:

- `src/components/CheckoutPageContent.test.tsx` covers checkout surface recovery states and can host promo validation and discount-row tests
- `src/lib/checkout-pricing.test.ts` covers summary calculation primitives and is the right place for discount math extensions
- `src/store.test.ts` covers cart-store behavior and is the right place for combo cart-line state tests
- `src/components/CartModal.test.tsx` and `src/components/MenuItemCard.test.tsx` are likely extension points for combo discovery and cart rendering tests
- `src/server/orders/create.test.ts` and `src/services/api-menu-mapping.test.ts` are likely extension points for order payload and combo mapping tests

Current gaps that still need dedicated tests:

- no explicit combo or promo-focused tests exist yet in the client repo
- no branch-isolation rendering tests for offers exist yet
- no stacked versus blocked discount matrix tests exist yet
- no confirmation or order-history snapshot tests for offers exist yet

## 3.3 Current Baseline Result

Automated baseline executed on 2026-03-17:

- `src/components/CheckoutPageContent.test.tsx` passed
- `src/lib/checkout-pricing.test.ts` passed
- `src/store.test.ts` passed
- `src/components/CartModal.test.tsx` passed
- `src/components/MenuItemCard.test.tsx` passed
- `src/server/orders/create.test.ts` passed
- `src/services/api-menu-mapping.test.ts` passed

Current automated status:

- checkout summary primitives and recovery states: `passed`
- cart store baseline behavior: `passed`
- order payload baseline behavior: `passed`
- explicit combo or promo coverage, branch isolation, and snapshot rendering: `not-started`

## 4. Discovery And Menu Validation

Discovery checklist:

- `CAPP-001` active combos render in a dedicated combo section when the branch has eligible offers
- `CAPP-002` branches without combos render a clean empty state instead of broken placeholders
- `CAPP-003` combo cards show combo price, base price, savings amount, and availability state clearly
- `CAPP-004` branch switching replaces visible combos with the new branch-specific set and never leaks other-branch offers
- `CAPP-005` paused, expired, or future-scheduled combos do not render as active discovery cards

## 5. Cart And Checkout Validation

Checkout checklist:

- `CHK-001` add combo to cart creates a combo cart line with the correct snapshot metadata
- `CHK-002` changing combo quantity updates subtotal, savings, and final total correctly
- `CHK-003` mixed carts with regular items plus combos render a truthful pricing breakdown
- `CHK-004` valid promo code shows success feedback and correct discount row
- `CHK-005` invalid, expired, or branch-mismatched promo code shows error feedback and restores non-discounted totals
- `CHK-006` cart edits that invalidate a previously accepted promo clear or revalidate the applied discount state correctly
- `CHK-007` stacking-allowed scenarios show the correct combined savings exactly once
- `CHK-008` stacking-blocked scenarios show a clear rejection state with no duplicate discounting
- `CHK-009` percentage discounts with caps and fixed discounts near subtotal boundaries render correctly

## 6. Confirmation And History Validation

Order snapshot checklist:

- `ORD-001` order confirmation shows the applied combo or promo summary used at checkout
- `ORD-002` order history re-renders the same discount snapshot after the source offer changes
- `ORD-003` ordinary non-offer orders remain visually unchanged after combos and promos are enabled
- `ORD-004` cancelled or failed offer-backed orders do not leave stale applied-discount UI in confirmation flows

## 7. Automated Test Matrix

Required automated coverage:

- combo section render tests
- combo card pricing and availability tests
- cart store tests for combo add, remove, and quantity updates
- promo validation interaction tests
- checkout summary tests for valid, invalid, expired, capped, and mixed-cart scenarios
- stacked versus blocked discount matrix tests
- confirmation and history snapshot render tests

## 8. Manual Test Scenarios

### 8.1 Combo Happy Path

1. Open a branch with active combos.
2. Verify the combo section and card pricing.
3. Add a combo to cart.
4. Proceed to checkout and verify totals.
5. Place the order and verify confirmation snapshot data.

### 8.2 Promo Happy Path

1. Build a qualifying cart.
2. Apply a valid promo code or automatic deal.
3. Verify discount row and final total.
4. Complete checkout.
5. Verify confirmation and history preserve the same offer snapshot.

### 8.3 Invalid And Recovery Path

1. Apply an invalid or expired promo.
2. Verify the error message and restored totals.
3. Apply a valid promo.
4. Modify the cart so the offer becomes invalid.
5. Verify the discount is cleared or revalidated cleanly.

### 8.4 Isolation And Stacking Path

1. Verify a branch-specific combo or promo in its home branch.
2. Switch to another branch and verify it no longer appears or validates.
3. Exercise one allowed stacking path and one blocked stacking path.
4. Verify the pricing summary matches the backend response in both cases.

## 9. Release Gate

The client side is not ready until:

1. combo discovery, cart, and checkout automated tests pass
2. invalid and recovery promo flows pass manually
3. branch isolation and stacking checks pass
4. confirmation and order history preserve offer snapshots correctly