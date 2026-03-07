# Client Resources Phased Rollout Plan

Last updated: 2026-03-06

## Goal

Turn the resource designs into an implementation roadmap that respects current product reality:

- implement direct matches first
- avoid inventing missing backend or navigation flows in the wrong phase
- close the highest-value design gaps in a controlled sequence

## Gap Matrix

| Resource design | Current app equivalent | Status | Phase |
| --- | --- | --- | --- |
| `main_home_screen.html` | Home | Partial | Existing workstream |
| `restaurant_menu_details.html` | Restaurant menu | Partial | Existing workstream |
| `menu_item_customization.html` | Item detail modal | Partial | Existing workstream |
| `order_tracking_map.html` | Order detail / tracking | Partial | Existing workstream |
| `user_profile_settings.html` | Profile | Partial | Existing workstream |
| `group_order_lobby.html` | `/group/[sessionId]` | Missing screen on existing route | Phase 1 |
| `checkout_payment_summary.html` | Checkout/cart flow | Missing route-level experience | Phase 2 |
| `split_the_bill_selection.html` | Group settlement flow | Missing route-level experience | Phase 2 |
| `active_carts_overview.html` | Active carts overview | Missing | Phase 2 |
| `ai_search_discovery.html` | Search | Partial but behavior-expanded | Phase 3 |
| `dietary_vault_preferences.html` | Profile preferences | Missing dedicated screen | Phase 4 |
| `ai_personal_meal_planner.html` | AI planner | Missing | Phase 4 |
| `ai_mystery_box_discovery.html` | Mystery box | Missing | Phase 5 |

## Existing-Screen Alignment Subset

These are the resource designs that already map to a real app route or component and should stay ahead of net-new concepts:

- home
- restaurant menu
- menu item customization
- order tracking/detail
- profile
- group order lobby
- search

## Phases

### Phase 1: Missing-Screen Foundation

Target: `group_order_lobby`

Why first:

- the route already exists
- group cart state already exists in the store
- Supabase realtime sync already exists
- the current experience is materially incomplete because it only redirects

Implementation scope:

- replace redirect-only join flow with a real lobby screen
- show restaurant, session code, invite actions, participant list, and running total
- preserve existing group session behavior and sync model
- keep checkout behavior out of this phase

Behavior definition:

- primary action: continue to the menu to keep adding items
- secondary action: leave or close the lobby
- fallback: if restaurant context is missing, keep the lobby usable with generic labels
- success/error feedback: copy/share invite must provide visible feedback; empty participant states must be explicit
- tracking: lobby impression, share click, copy click, continue click, leave click

### Phase 2: Checkout Architecture

Targets:

- `checkout_payment_summary`
- `split_the_bill_selection`
- `active_carts_overview`

Scope:

- promote cart and settlement flows into real route-level experiences
- define clear transitions between cart, checkout, split-bill, and payment states
- preserve current ordering logic while decomposing UI into stable screens

### Phase 3: Discovery and Search Expansion

Target: `ai_search_discovery`

Scope:

- keep current search usable during rollout
- add stronger AI-led query framing, recent searches, quick intents, and richer result presentation
- do not regress direct category and restaurant discovery

### Phase 4: Account and Preference Surfaces

Targets:

- `dietary_vault_preferences`
- `ai_personal_meal_planner`

Scope:

- split profile into clearer preference-management surfaces
- connect dietary rules and planning preferences to existing account data model where possible
- hold any unsupported recommendation logic behind clearly defined fallbacks

### Phase 5: Extended Menu and Surprise Experiences

Targets:

- `ai_mystery_box_discovery`
- deeper menu fidelity improvements

Scope:

- build the mystery-box discovery surface only after planner/preferences inputs exist
- revisit advanced menu recommendation and promotional surfaces after the core flows are stable

## Priority Order

1. Group lobby
2. Checkout and split-bill flow
3. Search expansion
4. Dietary and planner surfaces
5. Mystery box and advanced recommendation surfaces

## Current Implementation Start

This rollout starts with Phase 1.

Phase 1 deliverables:

- create a real lobby UI at `/group/[sessionId]`
- add pure helper utilities for participant status and summary totals
- add focused tests for the helper logic
- add locale strings for the new screen in English and Spanish