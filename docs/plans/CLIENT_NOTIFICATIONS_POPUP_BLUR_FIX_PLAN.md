# Client Notifications Popup Blur Fix Plan

## Summary

Align the restaurant-view notifications popup with the intended quick notifications tray design and fix the overlay architecture so the entire background blurs and dims instead of only the sticky header region.

## Current State Review

### Live popup shell

- `src/components/OrderNotificationsTray.tsx`
  - Owns the tray card shell, header, rows, and footer CTA.
  - Current shell is close to the intended design direction, but spacing, row density, and footer composition still diverge from the PNG.

### Notification rows

- `src/features/notifications/components/NotificationListItem.tsx`
  - Renders each compact notification row inside the tray.
  - Current row layout is slightly too loose vertically and does not fully match the visual density and right-side alignment shown in the design image.

### Overlay mount point

- `src/components/Navbar.tsx`
  - Opens the tray from the notifications button.
  - Currently mounts both the dimmer and the tray inside the sticky navbar subtree.
  - This is the likely root cause of the incomplete background blur, because the backdrop is trapped inside the navbar stacking context instead of living at viewport level.

### Design references

- `resources/designs/quick-notifications-tray.html`
- `resources/designs/quick-notifications-tray.png`

## Behavior Definition

Primary actions:
- Tap the notifications button to open the popup.
- Tap a notification row to navigate into the related order flow.
- Tap the footer CTA to open full notifications history.

Secondary actions:
- Tap outside the popup to dismiss.
- Tap the close button to dismiss.
- Press `Escape` to dismiss.

Fallback behavior:
- If there are no notifications, keep the same viewport-level modal behavior with the empty state.

Feedback expectations:
- Full-screen dim + blur behind the popup.
- Popup remains sharp and readable.
- Compact tray rows should preserve hierarchy for icon, title, body, timestamp, and chevron.

Tracking expectations:
- Preserve existing tray impression, dismiss, click, and footer-open events.

## Implementation Approach

### 1. Move the tray overlay to a viewport-level portal

- Render the overlay and popup via `createPortal` to `document.body`.
- Keep outside-click and `Escape` handling unchanged in behavior.
- Use a fixed full-screen dimmer layer so the blur applies to the whole restaurant page.

### 2. Reposition the tray independently from the navbar subtree

- Measure the notifications button position when opening.
- On desktop, keep the tray visually tied to the trigger.
- On mobile, bias toward a centered presentation that matches the design screenshot more closely.

### 3. Tighten shell styling to match the design

- Refine tray width, padding, border radius, header spacing, badge styling, and CTA container.
- Ensure the close button sits in the correct visual position instead of floating loosely.

### 4. Tighten compact notification rows

- Adjust row spacing, icon container sizing, timestamp placement, and chevron alignment.
- Reduce wrapping/overflow pressure in compact mode so the popup matches the PNG more closely.

### 5. Validate visually and behaviorally

- Confirm full-page blur coverage.
- Confirm tray open/close works from the restaurant page.
- Confirm at least one row click and the footer CTA still work.

## Files Expected To Change

- `src/components/Navbar.tsx`
- `src/components/OrderNotificationsTray.tsx`
- `src/features/notifications/components/NotificationListItem.tsx`
- `src/components/OrderNotificationsTray.test.tsx`
- possibly `src/components/Navbar.test.tsx` if the overlay mount strategy affects existing expectations

## Risks And Constraints

- Portal rendering can change stacking and test expectations, so focused regression coverage is required.
- Repositioning relative to the trigger should avoid clipping on narrow mobile widths.
- The design should be matched closely without breaking the existing notifications data flow.