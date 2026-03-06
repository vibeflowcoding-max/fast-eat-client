# App Shell

## Purpose

Defines the mobile frame, global spacing, safe areas, and reserved space for sticky and fixed chrome.

## Anatomy

- App background
- Mobile max-width frame
- Content column
- Sticky top chrome slot
- Fixed bottom chrome slot

## Rules

- Max width: 448px.
- Bottom padding must reserve room for navigation or action bars.
- Sticky and fixed layers require border separation and backdrop treatment.

## Behavior

- Primary action: none.
- Fallback: if safe-area utilities are unavailable, use conservative bottom padding.