# Client I18n And Mobile Audit Plan

## Summary

This plan covers two linked workstreams across `fast-eat-client`:

1. Complete localization coverage for all user-facing hardcoded text.
2. Audit and fix mobile overflow, clipping, and out-of-bounds layout issues across the app.

The implementation should preserve the current `next-intl` architecture, avoid introducing mixed-language screens, and improve mobile resilience without degrading established desktop behavior.

## Goals

- Eliminate remaining hardcoded user-visible strings from routes, components, and feature UIs.
- Keep message keys organized inside the existing `es-CR` and `en-US` locale files.
- Identify and fix mobile layout issues such as:
  - horizontal overflow
  - clipped text or icons
  - URLs or long labels escaping card bounds
  - fixed bottom chrome covering content
  - broken wrapping inside cards, trays, headers, chips, and modal surfaces

## Existing Foundation Review

### Localization

- App already uses `next-intl`.
- Locale files already exist:
  - `src/messages/es-CR/messages.json`
  - `src/messages/en-US/messages.json`
- Many major screens are already partially localized.
- Recent work introduced some new localized domains, including `notifications` and `profile` updates.

### Responsive UI

- App uses shared primitives and patterns from `resources/components`.
- Layouts commonly rely on:
  - `AppShell`
  - `BottomNav`
  - `Surface`
  - `Button`
  - `SectionHeader`
- A confirmed active bug exists in `src/app/profile/page.tsx` where long Google Maps URLs overflow in mobile view and compress surrounding layout.

## Behavior Rules

### Translation Workstream

Primary behavior:
- All user-facing text must come from translation messages.
- UI should not mix translated labels with hardcoded English or Spanish literals on the same screen.

Fallback behavior:
- Developer logs, diagnostics, internal comments, and non-user-visible strings do not need localization.
- Test-only strings can remain internal if not rendered to the user.

### Mobile Overflow Workstream

Primary behavior:
- No screen should exceed viewport width in mobile mode.
- Long values should wrap, clamp, truncate, or break safely depending on context.
- Fixed bottom navigation or action bars must not cover primary content.

Fallback behavior:
- Machine-like strings such as URLs, IDs, and tokens should be handled safely with `break-all`, `break-words`, truncation, or bounded containers.

## Audit Strategy

### Phase 1: Translation Inventory

Search targets:
- `src/app/**/*.tsx`
- `src/components/**/*.tsx`
- `src/features/**/*.tsx`
- `resources/components/**/*.tsx` where user-facing copy appears

Audit for:
- raw JSX text nodes
- literal button labels
- modal headings/descriptions
- section titles/subtitles
- empty/loading/error text
- aria-labels
- mixed-language literals in already-localized files

### Phase 2: Mobile Overflow Inventory

Search targets:
- key route pages under `src/app`
- dense/reusable UI under `src/components` and `src/features`
- sticky bottom/top chrome integration points

Audit for:
- missing `min-w-0` in flex layouts
- long unbroken text without `truncate`, `line-clamp`, `break-words`, or `break-all`
- fixed-width components incompatible with small screens
- absolute-positioned icons/text causing clipping
- cards or trays with content exceeding rounded container bounds
- insufficient bottom padding with `BottomNav`
- modals/drawers that exceed viewport height/width

## Priority Order

### Priority 1

- `src/app/profile/page.tsx`
  - Confirmed mobile overflow issue in live screenshot.
  - Also contains remaining hardcoded literals from earlier profile work.

### Priority 2

- Notification surfaces
- Orders and tracking pages
- Cart/checkout pages
- Address/location editors
- Planner, mystery-box, and discovery screens with longer descriptive copy

### Priority 3

- Remaining app-wide hardcoded labels and less visible responsive edge cases

## Implementation Approach

### Translation Implementation

1. Inventory missing strings by domain.
2. Extend message files in both locales.
3. Patch components to use `useTranslations` consistently.
4. Update affected tests.

### Responsive Implementation

1. Fix structural layout issues first:
   - safe widths
   - flex shrinking
   - wrap/truncation behavior
   - bottom spacing
2. Verify in mobile browser view.
3. Apply the same safe patterns across similar components.

## Files Expected To Change

- `src/messages/es-CR/messages.json`
- `src/messages/en-US/messages.json`
- `src/app/profile/page.tsx`
- multiple route/component files discovered during audit
- tests for changed components/routes

## Validation Plan

1. Focused tests for changed screens.
2. `npm run lint`.
3. Browser verification in mobile viewport for high-risk screens.
4. Full test run if the change set is broad enough.

## Notes

- This should be executed in slices, not as a blind global replacement.
- The first implementation slice should start with profile because it is both visibly broken and likely to establish reusable fixes for long text wrapping and hardcoded copy replacement.