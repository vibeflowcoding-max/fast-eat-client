# Home Discovery Test Templates

## What this document is for

Provides reusable behavior-driven test case templates for Vitest + RTL to speed up consistent feature testing.

Behavior-oriented templates for Vitest + RTL.

## 1) Intent chips
- Renders all configured chips.
- Toggles active chip on click.
- Clicking active chip resets intent to null.

## 2) Restaurant rails
- Loading state: renders skeleton.
- Error state: renders retry UI and calls `onRetry`.
- Empty state: renders fallback text.
- Success state: renders cards and compare buttons.

## 3) Home assistant
- Opens on launcher click and focuses input.
- Sends quick prompt and appends user message.
- Renders fallback assistant message when chat request fails.
- Emits recommendation-click event only on actual recommendation click.

## 4) Compare sheet
- Opens with options from rail and emits `source=rail` on select.
- Opens with options from chat and emits `source=chat` on select.
- Closes on backdrop click.
