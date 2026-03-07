# Client Partial And Missing Designs UI Implementation Plan

Last updated: 2026-03-06

## 1. Objective

Close the remaining gaps between `fast-eat-client/resources/designs` and the current `fast-eat-client` implementation for every view that is still partial or missing.

This plan covers the UI and route/component architecture only. API and database impacts are documented separately in:

- `fast-eat-api-nestjs/docs/plans/CLIENT_PARTIAL_AND_MISSING_DESIGNS_BACKEND_IMPLEMENTATION_PLAN.md`
- `fast-eat-api-nestjs/docs/plans/CLIENT_PARTIAL_AND_MISSING_DESIGNS_DATABASE_IMPLEMENTATION_PLAN.md`

## 2. Included Views

### Partial today

- `menu_item_customization.html`
- `order_tracking_map.html`
- `dietary_vault_preferences.html`
- `split_the_bill_selection.html`

### Missing today

- `ai_personal_meal_planner.html`
- `ai_mystery_box_discovery.html`

## 3. Code Review Summary

### Item customization

Current implementation exists in:

- `src/components/ItemDetailModal.tsx`
- `src/components/MainApp.tsx`
- `src/components/MenuItemCard.tsx`

Current behavior supports:

- quantity changes
- freeform notes
- add-to-cart confirmation

Current gap versus design:

- no structured modifier groups
- no required-selection validation
- no explicit add-on pricing breakdown
- no remove-ingredient or grouped choice UX

### Order tracking

Current implementation exists in:

- `src/app/orders/[orderId]/page.tsx`
- `src/components/OrderTrackingModal.tsx`
- `src/hooks/useOrderTracking.ts`

Current behavior supports:

- order status timeline
- bid and auction visibility
- order totals and items
- review submission from order detail

Current gap versus design:

- no live map canvas or courier position visualization
- no route preview from restaurant to customer
- no dedicated delivery progress visualization layer

### Dietary preferences

Current implementation exists in:

- `src/features/user/components/DietaryProfileSettings.tsx`
- `src/app/profile/page.tsx`
- `src/store.ts`
- `src/types.ts`

Current behavior supports:

- diet type
- allergies
- custom allergy entry

Current gap versus design:

- no dedicated route-level vault screen
- no stricter preference visualization
- no disliked ingredients UI
- no health goals or planning bridge

### Split the bill

Current implementation exists in:

- `src/features/payments/components/BillSplitterModal.tsx`
- `src/components/CheckoutPageContent.tsx`

Current behavior supports:

- itemized split
- equal split
- custom split
- SINPE confirmation handoff

Current gap versus design:

- no dedicated route-level review screen
- limited participant summary and payment-state feedback
- no saved split history or post-confirmation summary experience

### AI meal planner

No current route-level equivalent exists.

Relevant adjacent capabilities already exist in:

- `src/components/SearchPageContent.tsx`
- `src/app/api/search/ai-suggestions/route.ts`
- `src/features/user/components/DietaryProfileSettings.tsx`
- `src/store.ts`

### AI mystery box discovery

No current route-level equivalent exists.

Relevant adjacent capabilities already exist in:

- `src/components/HomePage.tsx`
- `src/components/SearchPageContent.tsx`
- `src/components/CartsPageContent.tsx`
- current restaurant, pricing, and cart flows

## 4. Product Guardrails

- Do not replace existing successful flows when an additive route or modal extension is sufficient.
- Reuse current `BottomNav`, state store, profile hydration, checkout draft, and cart persistence patterns.
- Keep all new views mobile-first and consistent with the current tokenized UI language already used in home, carts, checkout, and group lobby.
- For modal-first features already in production, only promote to route-level screens when the design materially requires multi-step interaction.

## 5. Behavior Definitions

### 5.1 Menu Item Customization

Primary action:

- select required and optional modifiers, adjust quantity, and add the configured item to cart.

Secondary actions:

- close the modal
- reset selections for the current item
- edit an existing cart line item

Fallback behavior:

- if a menu item has no modifier data, keep the current notes-based lightweight modal
- if modifier data exists but fails to load, show the item with quantity and notes only, plus a visible warning

Success and error feedback:

- inline validation for missing required groups
- running price total updates immediately
- explicit disabled state on add-to-cart while syncing

Tracking events:

- modifier modal impression
- modifier selection changed
- quantity changed
- add-to-cart confirmed
- modifier modal dismissed

### 5.2 Order Tracking Map

Primary action:

- review live delivery state and courier progress for an active order.

Secondary actions:

- expand the textual order detail
- view auction or bid details if courier has not been assigned yet
- contact support or review the restaurant/delivery once eligible

Fallback behavior:

- if no courier coordinates exist, show a non-map delivery progress card with status and ETA
- if the order is pickup or dine-in, hide map modules entirely

Success and error feedback:

- show last updated time for map telemetry
- degrade to textual delivery states if map data is stale or unavailable

Tracking events:

- tracking page impression
- map expanded
- delivery detail tapped
- bid tray opened

### 5.3 Dietary Vault Preferences

Primary action:

- review and save dietary preferences that should shape recommendations and warnings.

Secondary actions:

- toggle strictness
- add or remove allergens
- add disliked ingredients
- define health or nutrition goals

Fallback behavior:

- if the user is not authenticated, allow local editing and store in client state until profile save is possible
- if only partial profile fields exist in backend, preserve unsupported values locally and label them as local-only

Success and error feedback:

- show explicit save confirmation
- show which fields are synced to profile versus local-only

Tracking events:

- dietary vault impression
- allergy added or removed
- strictness changed
- goals saved

### 5.4 Split The Bill Selection

Primary action:

- choose a split strategy and confirm the amount each participant should pay.

Secondary actions:

- review items by participant
- switch strategy tabs
- reopen payment instructions

Fallback behavior:

- if group session data is incomplete, allow equal split only
- if participant item ownership is incomplete, clearly downgrade itemized split availability

Success and error feedback:

- show remaining unassigned total for custom strategy
- show payment requests or SINPE summary after confirmation

Tracking events:

- split modal impression
- split strategy switched
- split confirmed
- SINPE summary viewed

### 5.5 AI Personal Meal Planner

Primary action:

- generate a personalized meal suggestion from dietary rules, intent, and budget.

Secondary actions:

- refine preferences
- swap suggested dishes
- convert the plan into a cart or group order

Fallback behavior:

- if the planner cannot generate an AI answer, build heuristic suggestions from category, dietary profile, price band, and popular dishes
- if profile data is missing, ask only for the minimum intent inputs inline

Success and error feedback:

- show a planner rationale for each suggestion
- keep loading and fallback recommendation states explicit

Tracking events:

- planner impression
- planner submitted
- recommendation accepted
- recommendation replaced
- convert-to-cart

### 5.6 AI Mystery Box Discovery

Primary action:

- let the user accept a surprise offer with known constraints and price.

Secondary actions:

- reveal what is guaranteed versus variable
- reject and reroll within policy limits
- convert to cart

Fallback behavior:

- if no mystery inventory or merchant support exists, hide the module completely
- if a user has strict allergy settings and safe curation is not available, do not expose the mystery box CTA

Success and error feedback:

- make allergy safety and refund constraints explicit before purchase
- show whether the surprise box is restaurant-curated or AI-curated

Tracking events:

- mystery box impression
- eligibility failed
- reroll requested
- box accepted
- box converted to cart

## 6. UI Implementation Plan By View

### 6.1 Menu Item Customization

Target files to extend:

- `src/components/ItemDetailModal.tsx`
- `src/components/MainApp.tsx`
- `src/types.ts`
- `src/store.ts`

Planned UI work:

- extend the item detail modal data model to support modifier groups, options, min/max rules, and per-option price deltas
- add reusable group sections for single-choice, multi-choice, and optional extras
- show a pinned running total that includes modifiers and quantity
- keep freeform notes as a secondary field, not the primary customization tool
- support editing existing configured cart items without losing previously selected modifiers

UI acceptance criteria:

- items with no modifiers still work as they do today
- items with required groups cannot be added until the minimum is satisfied
- configured price summary is visible before add-to-cart

### 6.2 Order Tracking Map

Target files to extend:

- `src/app/orders/[orderId]/page.tsx`
- `src/components/OrderTrackingModal.tsx`
- `src/hooks/useOrderTracking.ts`
- new map presentation components under `src/features/orders/components/`

Planned UI work:

- add a map-capable delivery panel to the order detail page
- separate pickup/dine-in states from delivery states so the map appears only when meaningful
- show restaurant, destination, courier, ETA, and delivery-status checkpoints in one coherent module
- preserve the current bid and review flows beneath the tracking surface

UI acceptance criteria:

- non-delivery orders do not render an empty map shell
- delivery orders with no courier coordinates show an explicit non-map fallback state
- delivery orders with tracking data render the map card without regressing existing order details

### 6.3 Dietary Vault Preferences

Target files to extend:

- `src/app/profile/page.tsx`
- `src/features/user/components/DietaryProfileSettings.tsx`
- new route-level screen such as `src/app/profile/dietary/page.tsx`
- `src/store.ts`
- `src/types.ts`

Planned UI work:

- promote dietary preferences into a dedicated profile sub-surface while retaining quick access from profile
- add sections for allergies, dietary pattern, strictness, disliked ingredients, and health goals
- clearly distinguish recommendation preferences from hard safety constraints
- expose read-only summary chips back on the main profile screen

UI acceptance criteria:

- profile page can navigate into the dietary vault without cluttering the base profile layout
- values survive refresh and login transitions
- unsupported backend fields degrade to local-only persistence without data loss

### 6.4 Split The Bill Selection

Target files to extend:

- `src/features/payments/components/BillSplitterModal.tsx`
- `src/components/CheckoutPageContent.tsx`
- optional route-level screen under `src/app/checkout/split/page.tsx`

Planned UI work:

- keep the current modal for quick use, but add route-level parity if needed for long participant lists or payment confirmation summaries
- add clearer participant ownership summaries and strategy explanations
- show explicit post-confirmation payment instructions per participant
- integrate saved split state when reopening checkout for the same order

UI acceptance criteria:

- equal, itemized, and custom split remain available
- user can review exactly what each participant owes before confirming
- re-entering checkout can restore the last confirmed split state when supported by backend

### 6.5 AI Personal Meal Planner

Target route:

- `src/app/planner/page.tsx`

Planned supporting files:

- planner page content under `src/features/planner/components/`
- planner request and fallback client under `src/features/planner/services/`
- planner types under `src/features/planner/types.ts`

Planned UI work:

- collect intent inputs such as cravings, budget, nutrition preference, service mode, and dietary profile
- render a primary recommendation stack with explanation, price estimate, and conversion CTA
- allow swapping one recommendation at a time instead of rerunning the full plan from scratch
- support conversion into a current cart or a group cart seed

UI acceptance criteria:

- planner can return useful results even without a full dietary profile
- planner output is actionable, not just descriptive
- planner results can be moved into cart without manual item reconstruction by the user

### 6.6 AI Mystery Box Discovery

Target route:

- `src/app/mystery-box/page.tsx`

Planned supporting files:

- feature components under `src/features/mystery-box/`
- optional home discovery CTA integration in `src/components/HomePage.tsx`

Planned UI work:

- present eligible curated surprise offers with price ceiling, dietary safety summary, and restaurant identity
- allow a reroll flow if product policy permits it
- convert an accepted box into cart state with clear disclosure that contents may vary

UI acceptance criteria:

- unsafe mystery flows do not render for strict allergy users without explicit safe curation
- the surprise offer still discloses enough information to be trusted
- accepted mystery offers can be added to cart without breaking checkout

## 7. UI Phase Order

### Phase 1: Complete existing partials with strongest backend support

1. menu item customization
2. dietary vault preferences
3. split the bill selection

### Phase 2: Expand existing order detail into map-grade tracking

4. order tracking map

### Phase 3: Net-new recommendation surfaces with current data reuse

5. AI personal meal planner
6. AI mystery box discovery

## 8. Testing And Verification Expectations

- Add focused Vitest coverage for new helper logic and state transformations.
- Add RTL tests for route-level states, modifier validation, split selection, and dietary save flows.
- Use browser verification for every new user-facing screen or modal revision.
- Preserve carts, checkout, profile, and group session flows while layering new surfaces in.

## 9. UI Risks

- Modifier architecture can become incompatible with current cart item typing if configuration payloads are not normalized early.
- Tracking map UI can over-promise live delivery precision if courier coordinates are not reliably available.
- Dietary vault and planner surfaces can diverge if profile state is stored in two incompatible shapes.
- Mystery box UX can create trust and safety problems if allergen filtering is not enforced before recommendation.