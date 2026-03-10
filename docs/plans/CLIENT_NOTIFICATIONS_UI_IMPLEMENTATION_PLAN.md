# Client Notifications UI Implementation Plan

## Summary

Implement two connected notification surfaces in `fast-eat-client` using shared UI primitives and existing store data:

1. A redesigned quick notifications tray/overlay.
2. A full notifications history page.

The primary live data source is the existing `bidNotifications` store state. The implementation should avoid parallel notification systems and should extend the current order-notification tray into a more reusable pattern.

## Current State Review

### Existing notification entry points

- `src/components/Navbar.tsx`
  - Already exposes a notifications bell and unread count.
  - Already opens `OrderNotificationsTray`.
  - Already emits click/dismiss/conversion events for bid-related cues.

- `src/components/OrderNotificationsTray.tsx`
  - Currently renders a narrow bid-only list.
  - No reusable grouping, CTA footer, empty state polish, or history-route navigation.

- `src/store.ts`
  - Holds `bidNotifications`, `markBidNotificationRead`, and `setDeepLinkTarget`.
  - This remains the source of truth for the first implementation phase.

- `src/types.ts`
  - Already defines `BidNotification`.

- `src/components/BottomNav.tsx`
  - Currently fixed at five items.
  - Do not expand to six items in this phase.

## Design Inputs Reviewed

- `resources/designs/quick-notifications-tray.html`
- `resources/designs/quick-notifications-tray.png`
- `resources/designs/notifications-history.html`
- `resources/designs/notifications-history.png`

## Behavior Definition

### Quick notifications tray

Primary actions:
- Open from the existing navbar bell.
- Clicking a notification marks it as read, sets deep-link target, and routes to the associated order flow.
- Clicking the tray footer CTA routes to `/notifications`.

Secondary actions:
- Close by clicking outside.
- Close from explicit dismiss/close control if present.

Fallback behavior:
- If there are no notifications, show a reusable empty state in the tray.
- If a notification does not have a navigable target, it should still render as read-only content without fake affordances.

Feedback expectations:
- Unread notifications should be visually emphasized.
- Read notifications should be visually quieter.

Tracking expectations:
- tray impression
- tray item click
- tray dismiss
- tray footer click

### Notifications history page

Primary actions:
- Render all notifications in time-based sections such as `Today`, `Yesterday`, and `Earlier`.
- Clicking a row navigates to its target when available.

Secondary actions:
- Back navigation.
- Notification settings action should only be implemented if a real settings destination exists; otherwise it should be omitted.

Fallback behavior:
- Reusable empty state if no notification history exists.

Feedback expectations:
- Strong distinction between unread, read, and CTA-capable entries.

Tracking expectations:
- history page impression
- history row click
- history back click

## Implementation Approach

### Phase 1: Normalize store notifications for UI consumption

Create a small notifications mapping layer that transforms `BidNotification` entries into reusable view-model items with:

- `id`
- `title`
- `body`
- `timestamp`
- `read`
- `kind`
- `accent`
- `ctaLabel?`
- `orderId?`
- `bidId?`
- `groupLabel`

### Phase 2: Build reusable components

Add reusable notification UI pieces using shared primitives from `resources/components`:

- `NotificationListItem`
- `NotificationsPanel` or equivalent compact tray shell
- shared empty-state rendering

Use:
- `Surface`
- `Button`
- `SectionHeader`
- `EmptyState`

### Phase 3: Upgrade the tray

Refactor `OrderNotificationsTray.tsx` into a tray that:

- matches the new design direction
- supports grouped/stacked notifications
- supports a footer CTA to open `/notifications`
- preserves the current bid click behavior

### Phase 4: Add the full history page

Add `src/app/notifications/page.tsx` that:

- reads from the same mapped notifications source
- groups items by relative date bucket
- uses shared components
- includes explicit loading/empty/error-safe states even if current data is synchronous

### Phase 5: Testing

Update or add focused tests for:

- tray empty state
- tray click-through behavior
- tray footer routing
- history page grouping and click behavior

## Files Expected To Change

- `src/components/OrderNotificationsTray.tsx`
- `src/components/OrderNotificationsTray.test.tsx`
- `src/components/Navbar.tsx`
- `src/components/Navbar.test.tsx`
- `src/app/notifications/page.tsx`
- `src/app/notifications/page.test.tsx`
- support file(s) under `src/features/notifications/` or `src/lib/`
- translation files if page/tray copy is localized

## Validation Plan

1. Run focused tests for tray and notifications page.
2. Run `npm run lint`.
3. Browser-verify tray open/close and footer CTA.
4. Browser-verify `/notifications` grouped rendering and click-through behavior if there is notification data.

## Risks And Constraints

- The current store only contains bid notifications, so the first shipped UI will be visually richer than the underlying data set.
- The history page should not invent fake notification settings behavior.
- Bottom navigation should remain at five primary items in this phase.