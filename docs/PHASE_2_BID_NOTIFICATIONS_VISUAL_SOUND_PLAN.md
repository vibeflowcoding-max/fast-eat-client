# Phase 2 — Bid Notifications (Visual + Sound) Plan (fast-eat-client)

## Objective
Ensure customers receive immediate, clear feedback when a new delivery bid arrives: visual signal + sound cue, starting with restaurant view flow.

## Scope
- Realtime bid events consumed in `useOrderTracking`
- Existing bid notification tray/badge in `Navbar` and `OrderNotificationsTray`
- New client-safe sound utility aligned with `restaurant-partner-p` audio pattern
- Restaurant-view-first validation (Sumo Sushi order flow)

## Behavior Definition (Mandatory)

### Primary action
- On `delivery_bid_created` event for an active order:
  1) add bid to order state
  2) create unread notification entry
  3) play bid notification sound
  4) show a visual cue in restaurant view (`Navbar` area)

### Secondary action
- User can open tray and click a notification:
  - mark as read
  - deep-link to tracking context/order bid section

### Fallback behavior
- If audio is blocked/unavailable, keep visual signal and log a non-fatal warning.
- If order context is incomplete, still show generic bid alert with best-available order identifier.

### Success/error feedback
- Success: unread badge increments, alert appears, sound plays once (with anti-spam cooldown).
- Error path: no crash; event still reflected visually even if sound cannot play.

### Tracking events
Emit browser custom events for observability:
- `fast-eat:bid_notification_impression`
- `fast-eat:bid_notification_click`
- `fast-eat:bid_notification_dismiss`
- `fast-eat:bid_notification_conversion`

## Reuse Strategy from restaurant-partner-p
- Reuse Web Audio API chime pattern concept from `restaurant-partner-p/src/lib/audio.ts`.
- Keep implementation lightweight and client-safe in `fast-eat-client` (`src/lib/audio.ts`).
- Add cooldown control and one-time audio-context unlock on user interaction.

## Implementation Plan

### Step 1 — Audio utility
- Add `audioManager` in `fast-eat-client` with:
  - lazy audio context init
  - `setEnabled`
  - `unlock`
  - `playBidNotification`
  - cooldown protection

### Step 2 — Hook integration (`useOrderTracking`)
- On `delivery_bid_created`:
  - maintain existing state updates
  - trigger `audioManager.playBidNotification()`
  - dispatch `fast-eat:bid_notification_impression` with order/bid metadata

### Step 3 — Visual cue integration (`Navbar`)
- Add short-lived banner/toast-like inline cue near existing notification icon.
- Keep explicit tray interaction unchanged.
- Add click/dismiss tracking events.

### Step 4 — End-to-end validation workflow
1. Open `fast-eat-client` and navigate to Sumo Sushi restaurant view.
2. Create an order as client user.
3. Keep restaurant/order notification surface visible.
4. Insert valid rows directly into `delivery_bids` via Supabase MCP.
5. Confirm:
   - unread badge increments
   - visual cue appears
   - sound cue fires
   - tray click opens tracking context and marks read

## Database Test Preconditions
- Ensure inserted bids satisfy constraints:
  - `driver_offer >= base_price`
  - unique `(order_id, driver_id)`

## Definition of Done
- New bid events consistently surface visual + audio cues.
- No regressions in existing bid tray/deep link behavior.
- Works in restaurant view first.
- Verified with MCP browser + Supabase test inserts.

## Risks and Mitigations
- Browser autoplay policy: mitigate with lazy unlock on first user interaction.
- Event bursts causing noise: mitigate with cooldown.
- Duplicate event deliveries: existing dedupe in `useOrderTracking` remains active.
