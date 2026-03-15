# Client Strict Visual Diff And Remaining Work Plan

Date: 2026-03-10
Project: fast-eat-client
Scope: Compare `resources/designs/*.html` and matching PNG references against the current app, then define the remaining implementation work needed for design parity.

## Summary

The design pack is mostly implemented at the feature level, but several screens were absorbed into modal or embedded flows instead of being shipped as standalone destinations. The current implementation is strongest on functional parity and weakest on route-level parity and visual composition parity.

This document now also tracks cross-screen UI inconsistencies that make the product feel unfinished even where the feature exists.

Working conclusion:

- Feature coverage is high.
- Route-to-design parity is incomplete.
- The remaining work is primarily UI extraction, route framing, and consistency work, not backend invention.

## Implemented During This Audit

These issues were identified and fixed during the current pass:

1. Auth-screen icon regression

- Problem: Material symbol tokens such as `mail`, `lock`, and `visibility` were rendering as raw text instead of icons.
- Root cause: the shared icon system depended on the Material Symbols webfont, but the app layout did not load that stylesheet globally.
- Fix applied in:
	- `src/app/layout.tsx`
	- `src/app/globals.css`

2. Auth brand overlap / poor lockup

- Problem: the auth screen branding looked broken and did not match the product identity.
- Root cause: the auth shell used a placeholder restaurant symbol plus text instead of the FastEat brand assets.
- Fix applied in:
	- `resources/components/composites/auth-shell.tsx`

3. Password visibility affordance

- Problem: the password field showed the word `visibility` instead of an eye icon.
- Root cause: same global icon-font issue.
- Result: the password visibility control now renders as an icon as intended.

4. Shared UI consistency cleanup on existing screens

- Problem: several already-implemented screens still had generic or visually thin loading, empty, and gated states that made the product feel unfinished compared with the design system direction.
- Fixes applied in:
	- `src/components/FeatureGateCard.tsx`
	- `src/app/planner/page.tsx`
	- `src/app/mystery-box/page.tsx`
	- `src/app/notifications/page.tsx`
	- `src/app/profile/page.tsx`
	- `src/components/LoadingScreen.tsx`
	- `src/messages/es-CR/messages.json`
	- `src/messages/en-US/messages.json`
- Result:
	- planner and mystery-box now use a stronger auth-required card with explicit sign-in and home actions
	- notifications history empty state now matches the broader visual language instead of falling back to a generic empty block
	- profile loading now uses a branded skeleton card instead of a single inline spinner row
	- the app loading screen now uses a more intentional branded composition

These fixes improved both:

- `/auth/sign-in`
- `/auth/sign-up`
- `/planner`
- `/mystery-box`
- `/notifications`
- `/profile`

5. Dedicated address destination

- Problem: the address experience existed only as a modal and did not match the design pack's route-level destination.
- Fixes applied in:
	- `src/components/AddressDetailsForm.tsx`
	- `src/components/AddressDetailsModal.tsx`
	- `src/app/address/page.tsx`
	- `src/app/profile/page.tsx`
	- `src/lib/public-routes.ts`
	- `src/messages/es-CR/messages.json`
	- `src/messages/en-US/messages.json`
	- `src/app/address/page.test.tsx`
- Result:
	- the address flow now has a protected dedicated `/address` destination
	- profile location editing now routes into that destination instead of opening a modal in place
	- the shared modal still works, but now reuses the extracted shared address form logic

6. Foodie onboarding route

- Problem: the foodie profile experience existed only as prompt/modal logic and lacked a branded dedicated destination.
- Fixes applied in:
	- `src/app/onboarding/profile/page.tsx`
	- `src/features/home-discovery/hooks/useHomeAddressRecovery.ts`
	- `src/lib/public-routes.ts`
	- `src/messages/es-CR/messages.json`
	- `src/messages/en-US/messages.json`
	- `src/components/HomePage.onboarding-redesign.test.tsx`
	- `src/app/onboarding/profile/page.test.tsx`
- Result:
	- home prompt CTA now routes into a dedicated protected `/onboarding/profile` destination
	- onboarding now saves profile basics first, then routes users either to `/address` or back to home depending on address readiness

## Audit Method

The audit used these sources:

- Design HTML references in `resources/designs`
- Current implementation code in `src/app`, `src/components`, and `src/features`
- Live route inspection on `http://localhost:3000/` for reachable screens
- Current feature-flag state in `.env`

Important local flags affecting the audit:

- `NEXT_PUBLIC_HOME_STORY_MENUS=false`
- `NEXT_PUBLIC_HOME_FRIENDS_ACTIVITY=false`

These flags explain part of the home-screen design drift. They do not indicate missing implementation by themselves.

## Stricter Visual Diff

### 1. Main Home Screen

Design reference: `resources/designs/main_home_screen.html`

Current implementation:

- `src/components/HomePage.tsx`
- Live route: `/`

Status: Implemented with moderate visual drift

What matches:

- Delivery/location-first header behavior exists
- Search-first discovery entry exists
- Notifications trigger exists
- Category navigation exists
- Restaurant rails and discovery sections exist

What differs visually:

- The design is promo-carousel-forward and card-rail-centric, while the current page is more search-first and dense
- The current category rail is much longer and more utility-driven than the design
- Home modules such as story menus and friends activity are currently suppressed by feature flags
- The live page feels more system-oriented than the tighter, more curated design composition

Assessment:

- No major feature gap
- Moderate visual composition gap
- Not part of the remaining must-fix set unless exact home parity is desired

### 2. Login Screen

Design reference: `resources/designs/login_screen.html`

Current implementation:

- `src/app/auth/sign-in/page.tsx`
- Live route: `/auth/sign-in`

Status: Implemented with minor visual drift

What matches:

- Full sign-in screen exists
- Email/password flow exists
- Social continuation exists
- Clean card layout and strong hierarchy exist

What differs visually:

- Current page uses the shared resource component style instead of exact mobile mock proportions
- Typography and spacing are slightly more utilitarian than the design

Assessment:

- No meaningful remaining work required for parity unless pixel-level matching is requested

### 3. Create Account

Design reference: `resources/designs/create_account.html`

Current implementation:

- `src/app/auth/sign-up/page.tsx`

Status: Implemented with likely minor visual drift

What matches:

- Dedicated sign-up route exists
- Account creation flow exists

What differs visually:

- Not live-verified during this pass
- Expected drift is similar to sign-in: shared-system styling instead of exact mock geometry

Assessment:

- No remaining structural work identified

### 4. Set Address

Design reference: `resources/designs/set_address.html`

Current implementation:

- `src/components/AddressDetailsModal.tsx`
- `src/app/profile/page.tsx`
- `src/components/GoogleMapsAddressPicker.tsx`

Status: Partially implemented

What matches:

- Address capture exists
- Map-assisted location selection exists
- Manual entry exists
- Saved profile address behavior exists

What differs visually and structurally:

- The design is a standalone destination with a map preview, current location CTA, saved addresses list, and recent searches
- The current implementation is modal-first and form-first
- The current flow is optimized for data capture, not browsing and selecting from an address hub screen

Assessment:

- This is a genuine parity gap
- The underlying capability exists, but the route and visual framing do not match the design

### 5. Restaurant Menu Details

Design reference: `resources/designs/restaurant_menu_details.html`

Current implementation:

- `src/app/[slug]/page.tsx`
- `src/components/MainApp.tsx`
- Live route inspected: `/sumo-sushi`

Status: Implemented with minor to moderate visual drift

What matches:

- Hero section exists
- Restaurant metadata exists
- Search inside menu exists
- Category chips exist
- Item cards with add CTA exist
- Reviews and notifications entrypoints exist

What differs visually:

- Current screen is richer and denser than the design
- The live route emphasizes production data and utility actions over the mock’s cleaner composition
- Header chrome is more feature-rich than the minimal design header

Assessment:

- Strong parity overall
- No remaining structural work required

### 6. Menu Item Customization

Design reference: `resources/designs/menu_item_customization.html`

Current implementation:

- `src/components/ItemDetailModal.tsx`

Status: Implemented

Assessment:

- Functionally present
- Any remaining differences are likely styling-level only

### 7. Active Carts Overview

Design reference: `resources/designs/active_carts_overview.html`

Current implementation:

- `src/app/carts/page.tsx`
- `src/components/CartsPageContent.tsx`

Status: Implemented

Assessment:

- Dedicated route exists
- No remaining structural gap identified

### 8. Checkout Payment Summary

Design reference: `resources/designs/checkout_payment_summary.html`

Current implementation:

- `src/app/checkout/page.tsx`
- `src/components/CheckoutPageContent.tsx`

Status: Implemented with moderate visual drift

What matches:

- Order summary exists
- Payment and service options exist
- Location handling exists
- Split bill entry exists for group flow

What differs visually:

- Current checkout is a broader production form, not the tighter summary-first composition from the mock
- It is more feature-rich and less visually distilled than the design

Assessment:

- No missing capability
- No remaining structural work required for the current scope

### 9. Order Tracking Map

Design reference: `resources/designs/order_tracking_map.html`

Current implementation:

- `src/app/orders/[orderId]/page.tsx`
- `src/components/OrderTrackingModal.tsx`

Status: Partially implemented

What matches:

- Tracking data exists
- Status messaging exists
- Driver and bid interaction flows exist
- Order progression exists

What differs visually and structurally:

- The design is map-first, mobile-first, and focused on current rider status and ETA
- The current implementation is a broader operational order-tracking modal with auction and bid complexity
- The design emphasizes an always-visible route map and delivery card stack, while the current implementation emphasizes expandable status detail

Assessment:

- Capability exists
- Dedicated design parity does not exist yet

### 10. Foodie Profile

Design reference: `resources/designs/foodie_profile.html`

Current implementation:

- `src/components/ProfileCompletionModal.tsx`
- `src/components/ProfileCompletionPrompt.tsx`

Status: Partially implemented

What matches:

- Onboarding/profile completion exists
- Preference capture exists
- Address completion hooks exist

What differs visually and structurally:

- The design is a dedicated onboarding screen with a strong full-screen identity
- The current implementation is a compact modal optimized for completion, not a branded onboarding destination

Assessment:

- This remains a route-and-presentation parity gap

### 11. User Profile Settings

Design reference: `resources/designs/user_profile_settings.html`

Current implementation:

- `src/app/profile/page.tsx`

Status: Implemented with moderate visual drift

What matches:

- Dedicated profile/settings route exists
- Identity, saved addresses, favorites, language, and sign-out are present

What differs visually:

- The design is simpler and more card-list-oriented
- The current page includes more account logic and richer system feedback
- The current screen is less visually compact than the design

Assessment:

- No structural gap

### 12. Dietary Vault Preferences

Design reference: `resources/designs/dietary_vault_preferences.html`

Current implementation:

- `src/features/user/components/DietaryProfileSettings.tsx`
- `src/app/profile/page.tsx`

Status: Partially implemented

What matches:

- Diet, allergies, disliked ingredients, health goals, and strictness are present
- Local and synced states are supported

What differs visually and structurally:

- The design positions this as a dedicated “vault” destination
- The current implementation is a modal sheet launched from profile
- The tone, naming, and layout are not aligned one-to-one with the design

Assessment:

- Strong feature parity
- Incomplete route and screen parity

### 13. AI Mystery Box Discovery

Design reference: `resources/designs/ai_mystery_box_discovery.html`

Current implementation:

- `src/app/mystery-box/page.tsx`
- Live route: `/mystery-box`

Status: Implemented with moderate visual drift

What matches:

- Dedicated route exists
- Surprise offer concept exists
- Filtering and accept flow exist

What differs visually:

- The current unauthenticated state is a guarded explanatory screen rather than a high-energy discovery card layout
- The production page is more product-oriented than promotional in presentation

Assessment:

- No remaining structural gap

### 14. AI Personal Meal Planner

Design reference: `resources/designs/ai_personal_meal_planner.html`

Current implementation:

- `src/app/planner/page.tsx`
- Live route: `/planner`

Status: Implemented with moderate visual drift

What matches:

- Dedicated route exists
- Planner inputs and recommendation behavior exist
- Dietary profile linkage exists

What differs visually:

- The unauthenticated state is more utilitarian than the design mock
- The current page emphasizes filters and operational recommendations rather than a more narrative planning presentation

Assessment:

- No remaining structural gap

### 15. AI Search Discovery

Design reference: `resources/designs/ai_search_discovery.html`

Current implementation:

- `src/app/search/page.tsx`
- `src/components/SearchPageContent.tsx`
- Live route initially loaded, then code-reviewed

Status: Implemented with moderate visual drift

What matches:

- Dedicated search route exists
- AI suggestions exist
- Recent searches exist
- Quick filters and category browse exist

What differs visually:

- The design is more mobile-native and visually compact
- The current implementation uses a wider desktop-friendly card stack and a more generic system presentation
- The design’s discovery rhythm is tighter than the current implementation

Assessment:

- Good feature parity
- No remaining structural gap

### 16. Group Order Lobby

Design reference: `resources/designs/group_order_lobby.html`

Current implementation:

- `src/app/group/[sessionId]/page.tsx`

Status: Implemented

Assessment:

- No remaining structural gap identified

### 17. Split The Bill Selection

Design reference: `resources/designs/split_the_bill_selection.html`

Current implementation:

- `src/components/CheckoutPageContent.tsx`
- `src/features/payments/components/BillSplitterModal.tsx`
- `src/app/api/orders/[orderId]/splits/route.ts`

Status: Implemented with moderate visual drift

What matches:

- Equal, itemized, and custom split strategies exist
- Split confirmation flow exists
- Follow-up SINPE flow exists

What differs visually:

- The design shows a full dedicated screen with participant cards and a clean single-purpose summary
- The current implementation presents split selection inside a modal layered on checkout

Assessment:

- Functional parity exists
- Dedicated-screen parity is optional, not required for this remaining-work plan

### 18. Quick Notifications Tray

Design reference: `resources/designs/quick-notifications-tray.html`

Current implementation:

- `src/components/NotificationTrayTrigger.tsx`
- `src/components/OrderNotificationsTray.tsx`

Status: Implemented with minor visual drift

What matches:

- Overlay dimmer exists
- Floating notification tray exists
- Close behavior exists
- Link-out to notifications history exists

What differs visually:

- Content is tuned for order/bid notifications instead of the generic sample content in the mock
- Tray positioning is trigger-anchored rather than strictly top-right card composition from the design

Assessment:

- No remaining structural gap

### 19. Notifications History

Design reference: `resources/designs/notifications-history.html`

Current implementation:

- `src/app/notifications/page.tsx`
- Live route: `/notifications`

Status: Implemented with minor visual drift

What matches:

- Dedicated notifications history route exists
- Empty state exists
- Navigation back into the app exists

What differs visually:

- The current page is cleaner and more system-oriented than the mock

Assessment:

- No remaining structural gap

## Remaining Work

The remaining work should now focus on these two areas only:

1. Dietary Vault Preferences
2. Order Tracking Map

In addition, a separate UI-consistency cleanup pass is recommended for already-implemented screens.

## Additional UI Inconsistencies To Clean Up

These items do not necessarily represent missing features, but they do make the UI feel less polished than the design references.

### A. Shared Icon Reliability

Status:

- Core auth issue fixed.

Remaining concern:

- The app still relies heavily on Material Symbols token rendering across shared inputs and controls.
- A follow-up audit should confirm that every iconized control still renders correctly after navigation, hydration, and full refresh in all routes.

Files to review:

- `resources/components/primitives/icon.tsx`
- `resources/components/primitives/form-controls.tsx`
- Any route using shared `Icon`

Recommendation:

- Keep the global font fix in place.
- Add a lightweight regression checklist for icon-bearing inputs, action buttons, nav icons, and trailing controls.

### B. Loading Screen Design Drift

Observed in:

- `src/components/LoadingScreen.tsx`
- Live home and menu loading states

Issue:

- The loading screen is functional but visually generic relative to the design system.
- It does not carry enough of the design pack's intentional structure, hierarchy, or motion language.

Recommendation:

- Redesign loading states to feel native to the product surfaces they represent.
- Prefer screen-specific skeletons or richer loading shells instead of a single generic loading card.

### C. Profile Loading State

Observed in:

- `/profile`
- `src/app/profile/page.tsx`

Issue:

- The profile route falls back to a plain loading message and spinner treatment.
- This is correct functionally but visually weaker than the rest of the system.

Recommendation:

- Add a profile-specific skeleton or loading composition aligned with the account design.

### D. Planner And Mystery Box Unauthenticated States

Observed in:

- `/planner`
- `/mystery-box`

Issue:

- Both routes currently show guarded informational states that are structurally correct but visually flatter than their design references.
- The product tone shifts from discovery-oriented to utilitarian when unauthenticated.

Recommendation:

- Restyle unauthenticated states so they still feel premium and exploratory, even when gated.
- Preserve current auth requirement while improving the card hierarchy, illustration treatment, and CTA framing.

### E. Notification History Empty State

Observed in:

- `/notifications`
- `src/app/notifications/page.tsx`

Issue:

- Empty-state composition is clean but more generic than the tray and design references.
- It feels more like a system fallback than part of the designed product narrative.

Recommendation:

- Align the empty state with the tray visual language and the warm visual direction already used across the app.

### F. Home Visual Density And Feature-Flag Clarity

Observed in:

- `/`
- `src/components/HomePage.tsx`

Issue:

- The current home page is feature-rich but visually denser and less curated than the design references.
- Disabled modules such as story menus and friends activity make the home screen diverge further from some design variants.

Recommendation:

- If design parity is a near-term goal, define a dedicated home-polish pass after route extraction work.
- Distinguish clearly between disabled-by-flag modules and truly missing modules in future audits.

### G. Shared Auth Surface Follow-Up

Status:

- Brand and icon regression fixed.

Remaining recommendation:

- Review spacing, badge weight, and logo sizing against the PNG references.
- The auth screens are now stable and readable, but they can still be tuned further for exact visual parity.

## Files Reviewed For Remaining Work

### Address Flow

- `src/components/AddressDetailsModal.tsx`
- `src/app/profile/page.tsx`

Current code analysis:

- The modal is already well-structured and reusable
- It is form-centric and suitable as a shared core primitive for both modal and route usage
- The missing piece is a page-level shell that wraps the same logic in a destination-style experience

Suggestion:

- Do not rewrite the address form
- Extract a route-level container that reuses the same core address fields and Google Maps picker

### Foodie Profile Flow

- `src/components/ProfileCompletionModal.tsx`
- `src/components/ProfileCompletionPrompt.tsx`

Current code analysis:

- The current flow is optimized for completion speed and validation, not onboarding experience
- Validation and save behavior are already usable and should be preserved
- The missing piece is a full-page onboarding composition with stronger preference-first framing

Suggestion:

- Preserve existing validation and callbacks
- Introduce a dedicated onboarding route or screen component that wraps the same core behavior

### Dietary Vault

- `src/features/user/components/DietaryProfileSettings.tsx`
- `src/app/profile/page.tsx`

Current code analysis:

- The data model is stronger than the design mock
- The current component already supports richer behavior than the original design
- The main parity gap is route identity, naming, information architecture, and visual framing

Suggestion:

- Avoid replacing the current dietary editor
- Reframe it as a dedicated page-level destination and, if needed, keep the modal launcher as a secondary entrypoint

### Order Tracking

- `src/app/orders/[orderId]/page.tsx`
- `src/components/OrderTrackingModal.tsx`

Current code analysis:

- The tracking system is production-heavy and includes auction and bid management
- The design mock is simpler and customer-facing, emphasizing map, ETA, courier, and help
- The current implementation likely contains enough state and data to power a cleaner dedicated tracking screen without backend changes

Suggestion:

- Keep the current operational modal logic intact
- Build a separate route-level customer tracking presentation optimized around map, ETA, courier info, and support entrypoints

## Behavior-First Definitions

### 1. Set Address Screen

Primary action:

- Select or save the delivery address for current browsing or checkout context

Secondary action:

- Back, close, or cancel without changing the active address

Fallback behavior:

- If saved addresses do not exist, show current location and manual entry as the primary options
- If geolocation fails, keep manual search and map pin placement available

Success and error feedback:

- Success: update active address context and confirm selection
- Error: show clear geolocation or save failure message

Tracking events:

- Impression
- Use current location click
- Saved address selected
- Manual entry opened
- Address saved

### 2. Foodie Profile Screen

Primary action:

- Complete onboarding profile fields and continue into the app

Secondary action:

- Skip for now or close

Fallback behavior:

- If location permission is denied, route to manual address flow
- If profile is partially complete, resume with persisted values

Success and error feedback:

- Success: profile completion confirmed and navigation continues
- Error: inline validation and save failure feedback

Tracking events:

- Impression
- Continue click
- Skip click
- Request location click
- Manual address fallback click
- Completion success

### 3. Dietary Vault Screen

Primary action:

- Save dietary restrictions, dislikes, and goals

Secondary action:

- Back or dismiss without saving changes

Fallback behavior:

- If remote options fail to load, retain local editing for currently known values where possible
- If unauthenticated, save locally and communicate that sync is unavailable

Success and error feedback:

- Success: confirm local or synced save state
- Error: show save failure or catalog load failure inline

Tracking events:

- Impression
- Option toggled
- Custom allergy added
- Custom disliked ingredient added
- Save click
- Save success

### 4. Order Tracking Screen

Primary action:

- Monitor current order state and act on delivery interactions when needed

Secondary action:

- Open support, view summary, close, or return to order detail

Fallback behavior:

- If real-time map data is unavailable, show latest known status and ETA summary
- If courier data is missing, retain status timeline and support actions

Success and error feedback:

- Success: accepted bid, confirmed delivery, or support navigation feedback where relevant
- Error: show tracking fetch, action, or real-time refresh failures inline

Tracking events:

- Impression
- Open support
- Open summary
- Courier contact click
- Confirm delivery click
- Tracking refresh error

## Implementation Plan

### Phase 1. Address Destination

Goal:

- Create a dedicated address route while preserving the existing modal usage

Likely files to modify or create:

- `src/components/AddressDetailsModal.tsx`
- `src/app/profile/page.tsx`
- `src/app/address/page.tsx` or `src/app/set-address/page.tsx`
- Supporting navigation and i18n files as needed

Approach:

- Extract a shared address form shell from the modal if necessary
- Reuse existing save callbacks and map picker behavior
- Build the route-level header, saved-address list, current-location CTA, and recent-search presentation around the shared logic

Verification:

- Validate route render and interactions with browser tools
- Confirm current location, manual save, and back navigation behaviors

### Phase 2. Foodie Profile Onboarding Route

Goal:

- Promote the onboarding profile experience from modal-only to a dedicated branded screen

Likely files to modify or create:

- `src/components/ProfileCompletionModal.tsx`
- `src/components/ProfileCompletionPrompt.tsx`
- `src/app/onboarding/profile/page.tsx`
- Any shared form helpers required for reuse

Approach:

- Reuse validation and persistence logic
- Keep the modal for contextual completion, but add a full-screen route matching the design intent
- Connect manual address fallback into the new address destination

Verification:

- Validate the onboarding route with empty and partially populated user data
- Validate skip, continue, and permission-denied flows

### Phase 3. Dedicated Dietary Vault Destination

Goal:

- Add a true screen destination for dietary preferences while preserving the current modal entrypoint

Likely files to modify or create:

- `src/features/user/components/DietaryProfileSettings.tsx`
- `src/app/profile/page.tsx`
- `src/app/profile/dietary/page.tsx` or `src/app/vault/page.tsx`

Approach:

- Reuse the current data and save logic
- Introduce a destination-specific shell with the design’s vault framing
- Keep modal launch from profile for fast editing if desired

Verification:

- Validate authenticated and unauthenticated save states
- Validate catalog-loading error handling and save feedback

### Phase 4. Customer-Facing Tracking Screen

Goal:

- Create a route-level order tracking destination that matches the design’s map-first customer experience

Likely files to modify or create:

- `src/app/orders/[orderId]/page.tsx`
- `src/components/OrderTrackingModal.tsx`
- `src/app/orders/[orderId]/tracking/page.tsx`
- Shared tracking presentation helpers if needed

Approach:

- Reuse current tracking data sources
- Separate customer-friendly tracking presentation from auction-heavy operational controls
- Keep operational detail available, but not as the primary visual language of the route

Verification:

- Validate ETA, courier, summary, support, and empty/fallback states in the browser

## Sequencing Recommendation

Recommended order:

1. Dietary vault destination
2. Customer-facing order tracking screen
3. UI-consistency cleanup pass on already-implemented screens

Reasoning:

- Address is the lowest-risk extraction because the core component is already reusable
- Foodie profile depends on better address routing for its fallback flow
- Dietary vault is mostly presentation and routing work
- Order tracking is the highest-risk presentation split because the current tracking surface is operationally dense
- The consistency cleanup should happen after the route extractions so shared primitives and loading states can be polished with the new screen structure in mind

## Suggested Cleanup Workstream

After the four route-parity phases, run a short cleanup stream with these targets:

1. Replace generic loading states with route-specific skeletons
2. Re-audit all shared icon-bearing controls after full refresh and route navigation
3. Tighten unauthenticated planner and mystery-box compositions
4. Improve empty and loading states for profile and notifications
5. Recheck auth screens against the PNG references for spacing and logo-scale tuning

## Test And Validation Expectations

For each phase:

- Add or update minimal Vitest coverage when logic extraction is introduced
- Validate visual behavior in the browser after implementation
- Confirm loading, error, and empty states explicitly
- Confirm analytics event dispatch behavior for the defined user actions

## Final Recommendation

Treat the remaining work as a route-extraction and screen-parity project, not a feature-building project. The current system already contains the hard parts. The main task now is to expose the existing behavior through screen shapes that match the design pack more closely.