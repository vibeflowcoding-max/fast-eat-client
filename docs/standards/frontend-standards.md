# Frontend Standards (Home Discovery)

## What this document is for

Defines the day-to-day frontend engineering rules and quality expectations for implementing and reviewing Home discovery code.

This document is the day-to-day condensed version of section 5.1 in [HOME_UI_AI_IMPLEMENTATION_PLAN](../plans/implemented/HOME_UI_AI_IMPLEMENTATION_PLAN.md).

## 1) Components and purity
- Keep components pure and idempotent.
- Keep side effects out of render; prefer event handlers, then `useEffect` only for external sync.
- Prefer composition and small focused components.

## 2) State structure
- Keep state minimal; derive values in render when possible.
- Avoid contradictory flags; prefer explicit status states.
- Store IDs instead of duplicating full entities.
- Lift state only to nearest shared owner.

## 3) Effects and data flow
- Do not use effects for pure data transforms.
- Keep user-triggered logic in handlers (`click`, `submit`, `select`).
- Handle cancellation/race for async requests.
- Reuse custom hooks for side-effect flows.

## 4) App Router boundaries
- Default to Server Components.
- Keep `"use client"` boundaries as low as possible.
- Use section-level loading/error UI where practical.
- Lazy-load non-critical interactive bundles.

## 5) Accessibility
- Keyboard support for chips/cards/launcher/dialog controls.
- Visible focus states and predictable focus order.
- Respect reduced-motion preferences.
- Do not rely on color alone to convey meaning.

## 6) Async UI quality gate
Every new async Home section must define all four states:
- Loading
- Error
- Empty
- Success

## 7) Performance and reliability
- Prevent waterfalls with parallel fetch when feasible.
- Keep payloads compact and typed.
- Include trace IDs for discovery requests.
- Never break UX for telemetry failures.
