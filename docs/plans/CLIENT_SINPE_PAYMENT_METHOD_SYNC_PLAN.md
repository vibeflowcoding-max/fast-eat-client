# Client SINPE Payment Method Sync Plan

## Summary

Fix the consumer order creation flow so a payment method selected in `fast-eat-client` is preserved through `fast-eat-api-nestjs`, stored on the order row, returned by the restaurant orders listing, and rendered correctly in `restaurant-partner-p`.

This plan is driven by a live failure already reproduced end-to-end:

- The client sent `paymentMethod: "sinpe"` in `POST /api/orders`
- The order was created successfully
- The restaurant portal received the order as pending
- The restaurant order list returned `paymentMethod: null`
- The restaurant UI rendered the order as `CASH`
- The SINPE warning in the confirm dialog did not appear because the order no longer identified as SINPE by the time it reached the portal

## Goal

Ensure that when the customer chooses `SINPE` in the client checkout flow:

1. The backend accepts the submitted payment method
2. The backend normalizes it to the domain enum expected by the orders module
3. The order row stores the normalized value
4. The restaurant orders list returns the same payment method
5. The restaurant portal renders `SINPE`
6. The order acceptance dialog shows the existing SINPE warning before confirmation

## Reviewed Code And Findings

### fast-eat-client

#### `src/services/api.ts`

Reviewed `submitOrderToMCP()`.

Current behavior:

- Builds the order payload for `POST /api/orders`
- Sends `paymentMethod: orderMetadata.paymentMethod`
- The client currently sends lowercase values such as `cash`, `card`, and `sinpe`

Assessment:

- The client is already collecting and sending the user-selected payment method
- This is not the root failure point
- A small client-side normalization step may still be useful to keep the contract explicit and reduce ambiguity

#### Upstream checkout flow

Observed through the live browser session:

- The cart UI allowed selecting `SINPE`
- The generated request body included `paymentMethod: "sinpe"`
- The request succeeded with `201 Created`

Assessment:

- The checkout UI behavior is already correct enough for the intended feature
- No UX redesign is required for this bug fix

### fast-eat-api-nestjs

#### `src/modules/consumer/dto/consumer-order.dto.ts`

Reviewed `CreateConsumerOrderDto`.

Current behavior:

- The DTO does not define a `paymentMethod` field
- The endpoint uses validation with whitelist semantics
- Unknown properties are stripped before service logic receives them

Assessment:

- This is the first concrete failure point
- The backend contract currently rejects the client field implicitly, even though the request itself returns success

#### `src/modules/consumer/services/consumer.service.ts`

Reviewed `createOrder()`.

Current behavior:

- Builds `orderPayload` for insertion into `orders`
- Hardcodes `payment_method: 'CASH'`
- Does not read or normalize a client-provided payment method

Assessment:

- This is the second concrete failure point
- Even if the DTO accepted the field, the service currently overwrites it
- This is the core root cause for incorrect persistence

#### `src/modules/orders/enums/order.enums.ts`

Reviewed `PaymentMethod` enum.

Current behavior:

- Backend enum already supports `CASH`, `CARD`, `SINPE`, and `TRANSFER`

Assessment:

- The domain model already supports SINPE
- The bug is in the consumer intake path, not the orders domain itself

### restaurant-partner-p

#### Existing confirm warning behavior

Reviewed the earlier implementation and live behavior.

Current behavior:

- The confirm dialog already shows a special warning when the order payment method is `SINPE`
- The warning did not appear in live testing because the backend returned `paymentMethod: null`

Assessment:

- No new UI behavior is needed for this phase
- The restaurant portal mainly depends on the upstream data fix

## Root Cause

The failure is a cross-repo contract mismatch with two backend-side breaks:

1. `fast-eat-client` sends lowercase payment methods such as `sinpe`
2. `fast-eat-api-nestjs` consumer DTO does not accept `paymentMethod`
3. The validation pipeline strips the field
4. `consumer.service.ts` inserts the order with hardcoded `payment_method: 'CASH'`
5. The restaurant order list later returns `paymentMethod: null` or a non-SINPE fallback
6. `restaurant-partner-p` cannot trigger the SINPE warning because the source data is wrong

## Recommended Fix Strategy

Use the smallest cross-repo change set that fixes the contract at the backend boundary and keeps the client explicit.

### Recommendation

Implement both of these changes:

1. Backend-first contract fix in `fast-eat-api-nestjs`
2. Client-side normalization in `fast-eat-client`

Reasoning:

- The backend must be fixed regardless, because it currently drops and overwrites the field
- Client-side normalization reduces future ambiguity and makes the payload align with the backend enum contract
- This combination is low risk and avoids adding workaround logic in the restaurant app

## Proposed Implementation Plan

### Phase 1: Define And Accept The Payment Method Contract

Target repo: `fast-eat-api-nestjs`

Files to review and likely modify:

- `src/modules/consumer/dto/consumer-order.dto.ts`
- `src/modules/orders/enums/order.enums.ts`
- `src/modules/orders/dto/list-orders.response.dto.ts` only if response mapping needs confirmation

Tasks:

1. Add an optional `paymentMethod` field to `CreateConsumerOrderDto`
2. Validate it against the supported order payment methods
3. Decide on accepted input shape:
   - Either accept uppercase enum values only
   - Or accept lowercase client values and normalize them in service logic

Preferred approach:

- Accept the field in the DTO
- Normalize in service logic so the API remains tolerant of existing lowercase client payloads

Why:

- This preserves backward compatibility with the current client payload
- It prevents similar contract drift from breaking order creation silently

### Phase 2: Persist The Normalized Payment Method On Order Creation

Target repo: `fast-eat-api-nestjs`

Primary file:

- `src/modules/consumer/services/consumer.service.ts`

Tasks:

1. Read the accepted `paymentMethod` from the DTO payload
2. Normalize it to the enum shape used by the orders module
3. Replace the hardcoded `payment_method: 'CASH'`
4. Keep a safe fallback only when the client genuinely omits payment method

Suggested normalization rule:

- `cash` -> `CASH`
- `card` -> `CARD`
- `sinpe` -> `SINPE`
- `transfer` -> `TRANSFER`

Suggested default behavior:

- If no payment method is provided, default to `CASH`
- If an invalid method is provided, fail validation instead of silently converting to cash

Why:

- Silent fallback to `CASH` on invalid input would hide future bugs
- Explicit validation makes payment-related behavior auditable and predictable

### Phase 3: Keep The Client Contract Explicit

Target repo: `fast-eat-client`

Primary file:

- `src/services/api.ts`

Possible supporting files if types need alignment:

- `src/types.ts`
- `src/components/OrderForm.tsx`

Tasks:

1. Normalize `paymentMethod` before serializing the order payload, or at minimum centralize the supported values at the API boundary
2. Confirm that every checkout path uses the same canonical mapping
3. Avoid changing visible checkout behavior unless needed

Preferred approach:

- Keep UI state lowercase if that matches existing client conventions
- Normalize at the request builder before `fetch('/api/orders')`

Why:

- This minimizes UI churn
- It keeps the API payload closer to the backend enum contract
- It reduces debugging ambiguity when inspecting network traffic

### Phase 4: Verify Restaurant Consumption Path

Target repo: `restaurant-partner-p`

Files to review:

- `src/services/orders.service.ts`
- Any payment-method mapping helpers used by order cards or dialogs

Tasks:

1. Confirm the orders API mapper preserves `SINPE` instead of translating nullish values to `CASH`
2. Confirm the pending order card shows `SINPE`
3. Confirm the acceptance dialog shows the already-implemented SINPE warning

Expected outcome:

- No product code change may be needed here if the data is returned correctly
- If a fallback mapper incorrectly converts null to cash, remove that fallback and let actual API values drive the UI

## Test And Validation Plan

### Backend Validation

1. Add or update tests for consumer order creation with `paymentMethod: 'sinpe'`
2. Assert the inserted order payload stores `payment_method: 'SINPE'`
3. Add one negative test for an unsupported payment method
4. Run backend build and relevant tests

### Client Validation

1. Add or update a test around `submitOrderToMCP()` payload shaping if coverage already exists nearby
2. Assert the serialized request contains the canonical payment method expected by the backend contract

### End-To-End Manual Validation

1. In `fast-eat-client`, create a new pickup order using `SINPE`
2. Inspect the network request and confirm the intended payment method is submitted
3. In `fast-eat-api-nestjs`, verify the created order row and list response contain `paymentMethod: 'SINPE'`
4. In `restaurant-partner-p`, refresh the orders board
5. Confirm the pending order card displays `SINPE`
6. Click `Aceptar pedido`
7. Confirm the SINPE warning renders before acceptance
8. Enter estimated minutes and confirm the order
9. Verify the order moves forward with the selected estimate still intact

### Browser Verification Requirement

Because this affects an existing interactive UI path, final verification should include:

- `fast-eat-client` live order creation in the browser
- `restaurant-partner-p` live confirm dialog check in the browser

## Risks And Edge Cases

1. There may be more than one consumer order creation path, such as `virtualMenu` or other sources, using different naming or casing for payment methods
2. Lowercase and uppercase values may already coexist in logs or test fixtures
3. A restaurant-side mapper could still translate null or unknown values to `CASH`, masking backend improvements
4. If any analytics, notifications, or bot flows assume `CASH` by default, they may need a quick regression pass

## Minimal Change Preference

Prioritize these exact changes first:

1. Accept `paymentMethod` in consumer DTO
2. Normalize and persist it in consumer service
3. Normalize client payload generation
4. Re-run the live SINPE flow

Avoid expanding scope into:

- Payment-status redesign
- New checkout UI states
- New restaurant warning variants
- Refactors unrelated to the consumer order contract

## Files And Paths Expected To Change During Implementation

### fast-eat-api-nestjs

- `src/modules/consumer/dto/consumer-order.dto.ts`
- `src/modules/consumer/services/consumer.service.ts`
- Potentially a nearby consumer service spec or controller spec if present

### fast-eat-client

- `src/services/api.ts`
- Potentially `src/types.ts` if contract typing needs tightening
- Potentially a nearby test file covering order submission

### restaurant-partner-p

- Likely no code changes expected
- Possible mapper adjustment only if a UI fallback still converts missing payment methods to `CASH`

## Suggested Execution Order

1. Fix backend DTO and persistence
2. Tighten client payload normalization
3. Run backend validation
4. Run client validation
5. Create a live SINPE order
6. Verify the restaurant warning with the live order

## Success Criteria

The fix is complete only when all of these are true:

1. A client-created SINPE order stores `SINPE` on the backend
2. The restaurant orders list returns `paymentMethod: 'SINPE'`
3. The restaurant order card displays `SINPE`
4. The confirm dialog shows the SINPE warning before acceptance
5. Confirming the order still persists the manually entered estimated time

## Recommendation For Implementation

Proceed with a focused cross-repo implementation limited to the consumer order contract and live verification. This is a small but behavior-critical fix, and it should be handled as a data-contract correction rather than a UI problem.