# Home Regression Watchlist

## What this document is for

Tracks critical user journeys and stability checks that must remain intact during canary and full rollout.

Use this checklist before canary/full rollout of Home discovery changes.

## Critical journeys
- Onboarding modal still appears for non-onboarded users.
- Search query still filters restaurant list and rails.
- Category filtering still updates restaurant results.
- Navigation from Home card to restaurant route still works.
- Home assistant and restaurant chatbot remain isolated.

## Compare flow
- Compare open from rail emits `compare_open` with `source=rail`.
- Compare open from assistant emits `compare_open` with `source=chat`.
- Compare select preserves source in emitted event.

## Reliability
- Empty rails show fallback empty UI (no crash).
- Rail fetch errors show section-level retry state.
- Discovery chat fallback response renders safely when API is unavailable.

## Accessibility and motion
- Keyboard can open/close assistant launcher/dialog.
- Escape key closes Home assistant.
- Focus lands on assistant input when opened.
- Reduced-motion preference disables non-essential pulse/transform effects.
