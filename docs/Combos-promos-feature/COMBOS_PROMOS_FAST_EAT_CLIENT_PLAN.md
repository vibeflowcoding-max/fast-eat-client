# Combos And Promos Fast-Eat-Client Plan

## Related Documents

- QA plan: `COMBOS_PROMOS_FAST_EAT_CLIENT_QA_PLAN.md`

## 1. Scope

This document defines the consumer-facing work required in `fast-eat-client` to expose combos and promos in browsing, cart, checkout, and order confirmation flows.

## 2. Product Position In The Consumer App

### 2.1 Combo Discovery

Combos should be visible as a dedicated menu experience, not hidden inside generic item cards only.

Recommended display approach:

- a dedicated `Combos` section near the top of the branch menu when combos are active

### 2.2 Promo Experience

Promos should be visible in checkout and pricing breakdowns.

Recommended V1 approach:

- support automatic eligible deal display
- support promo entry if backend V1 includes `promo_code`

## 3. Consumer Behaviors To Define

### 3.1 Combo Card Behavior

Each combo card should show:

- title
- description
- combo price
- original value or base price
- savings amount
- availability state

### 3.2 Add To Cart Behavior

For fixed bundle Combo V1:

- add combo directly to cart as a single user action
- preserve enough metadata in cart state to render savings and submit the order correctly

### 3.3 Checkout Behavior

Checkout should:

- show subtotal
- show discount row when a deal applies
- show fees and delivery separately
- show final total clearly
- explain invalid promo state without ambiguous totals

### 3.4 Order Confirmation Behavior

Order confirmation and order history should preserve:

- applied combo savings
- applied promo discount snapshot
- final total used for the order

## 4. Likely Files To Change

Existing files likely affected:

- `src/server/consumer/menu.ts`
- `src/components/MenuItemCard.tsx`
- `src/components/ItemDetailModal.tsx`
- `src/components/CartModal.tsx`
- `src/components/CheckoutPageContent.tsx`
- `src/store.ts`
- `src/types.ts`

## 5. Component-By-Component Task Plan

### 5.1 `src/types.ts`

Add explicit offer-aware types:

- `ComboOffer`
- `ComboOfferItem`
- `DealValidationResult`
- `AppliedDiscountSummary`
- `CartComboItem` or a cart-line discriminator for combo lines

Recommended cart type direction:

```ts
type CartLine = CartMenuItemLine | CartComboLine;
```

Where combo lines carry:

- `comboId`
- `basePrice`
- `comboPrice`
- `savingsAmount`
- `includedItems`

### 5.2 `src/server/consumer/menu.ts`

Tasks:

1. extend the server fetch path to request active combos for the branch
2. normalize combo payloads alongside menu items
3. preserve current menu fetching behavior when the offers endpoint fails
4. return an offers collection in the server payload for the page shell

### 5.3 `src/components/MenuItemCard.tsx`

Tasks:

1. keep regular menu item behavior unchanged
2. optionally extract a shared pricing badge primitive if combo cards need the same styling logic
3. avoid overloading this component with combo-only layout if a dedicated combo card is cleaner

### 5.4 New `src/components/ComboOfferCard.tsx`

Recommended new component.

Tasks:

1. render combo title, description, combo price, base price, and savings
2. show unavailable state when the offer cannot be ordered
3. trigger add-to-cart directly for fixed bundle V1

### 5.5 `src/components/ItemDetailModal.tsx`

Tasks:

1. leave regular item customization flow intact
2. only integrate combo entry here if product decides to present combos near related items
3. do not force combo ordering through the item modal in Phase 1 if a dedicated combo card can add directly to cart

### 5.6 `src/store.ts`

Tasks:

1. support a cart-line discriminator for regular items versus combos
2. add actions for `addComboToCart`, `removeComboFromCart`, and `updateComboQuantity`
3. store applied deal summary in checkout state
4. clear applied deal state when cart changes invalidate the discount
5. keep backward-compatible actions for ordinary menu items

### 5.7 `src/components/CartModal.tsx`

Tasks:

1. render combo lines distinctly from regular item lines
2. show combo savings information where appropriate
3. show applied deal summary row if a discount is already validated before full checkout
4. avoid duplicating the final pricing logic that belongs in checkout summary helpers

### 5.8 `src/components/CheckoutPageContent.tsx`

Tasks:

1. add discount row in the pricing summary
2. add promo validation UI if `promo_code` is in Phase 1
3. show validation pending, success, and failure states
4. ensure totals recalculate correctly when quantities or lines change
5. submit combo and deal metadata in the final order payload

### 5.9 New `src/components/PromoCodeField.tsx`

Recommended new component if promo codes are part of Phase 1.

Tasks:

1. collect promo code input
2. call deal validation flow
3. render success or error feedback
4. allow clearing the applied code cleanly

### 5.10 `src/components/OrderSummaryBreakdown.tsx`

If pricing summary is currently embedded inline, consider extracting it.

Tasks:

1. centralize subtotal, discount, fees, delivery, and final total rendering
2. reduce drift between cart and checkout breakdowns
3. keep labels and currency formatting consistent

## 6. Data Fetching Plan

The app should fetch:

- active combos for the branch
- eligible deals or promo-validation results during checkout
- discount-aware order creation responses

Recommended approach:

- keep menu fetching server-driven
- add offers payloads to the branch menu fetch or fetch them in parallel from a dedicated offers endpoint
- keep checkout promo validation as an explicit API call

## 7. State Management Plan

Cart state should be extended to store:

- combo line type metadata
- base price snapshot
- combo price snapshot
- savings amount
- applied deal summary
- validated promo code if supported

Recommended state invariants:

1. a combo line must never also behave as a regular menu item line
2. applied deal state must be cleared when the cart changes materially unless the backend revalidates successfully
3. pricing displayed in checkout should always derive from the same source of truth used for order submission

## 8. UI Plan

### 7.1 Menu Surface

Recommended additions:

- combo section container
- combo cards or tiles
- savings badges
- explicit empty handling when no combos are available

### 7.2 Cart Surface

Recommended additions:

- combo line display treatment
- original value and savings messaging where appropriate
- deal summary row
- invalidated promo state cleanup messaging if cart edits remove eligibility

### 7.3 Checkout Surface

Recommended additions:

- promo validation input if enabled for V1
- discount line in pricing summary
- recalculation states after cart changes
- separate rendering for validation pending, validation failed, and applied successfully

## 9. API Contract Expectations

The client plan assumes these backend contracts:

1. branch menu payload includes or can be paired with `ComboOffer[]`
2. deal validation returns `valid`, `discount_amount`, and an offer summary payload
3. order creation accepts combo lines and applied deal metadata
4. order creation response returns discount-aware `financials` and `applied_discounts`

Recommended client-side order payload extension:

```ts
{
	items: Array<
		| {
				item_id: string;
				quantity: number;
				variant_id?: string | null;
				notes?: string;
				modifiers?: Array<{ modifier_item_id: string; quantity?: number }>;
			}
		| {
				combo_id: string;
				quantity: number;
				notes?: string;
			}
	>;
	applied_deal_id?: string;
	promo_code?: string;
}
```

## 10. Automated Test Plan

Required unit and component coverage:

1. combo section renders when offers exist
2. combo cards display price and savings correctly
3. add combo to cart updates state correctly
4. checkout pricing summary renders discount row correctly
5. invalid promo clears correctly and restores totals
6. order confirmation renders applied discount snapshot data

Recommended file-level test targets:

1. combo card render tests
2. cart store action tests for combo lines
3. checkout pricing calculation tests for applied deals
4. promo validation interaction tests
5. order payload serialization tests for mixed item and combo carts

## 11. Manual Test Plan

1. Browse a branch with active combos and verify combo section visibility.
2. Add a combo to cart and verify savings and total.
3. Apply a valid promo in checkout and verify discount line.
4. Apply an invalid or expired promo and verify error messaging.
5. Complete an order with a combo and verify confirmation pricing.
6. Verify non-offer orders remain unchanged.

## 12. Recommended Delivery Order

1. types and cart model changes
2. server menu fetch changes
3. combo card and combo section rendering
4. cart modal support for combo lines
5. checkout discount rendering and promo validation
6. order payload and confirmation support