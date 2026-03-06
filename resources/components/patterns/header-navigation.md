# Header And Navigation

## Covers

- Location header
- Screen title bar
- Notification action
- Bottom tab navigation

## Behavior

### Sticky Discovery Header

- Primary action: open address selector.
- Secondary action: open notifications.
- Fallback: if geolocation or saved address is unavailable, show a generic delivery prompt.
- Tracking: `header_location_click`, `header_notifications_click`.

### Bottom Navigation

- Primary action: switch app section.
- Secondary action: cart badge announces count but is not a second target.
- Fallback: if a destination is unavailable, keep tab disabled or route to a safe default.
- Feedback: active state changes icon fill, label weight, and accent color.
- Tracking: `nav_tab_click`, `nav_tab_impression`.

## Rules

- Exactly one active tab.
- Labels stay visible; icons never stand alone.
- Badges use the count badge primitive.