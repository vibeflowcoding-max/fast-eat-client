# Home A11y + Performance Release Checklist

## What this document is for

Provides the mandatory pre-release quality gate for accessibility and performance before shipping Home discovery changes.

## A11y gate (must pass)
- Run `npm run test:a11y`
- Verify keyboard tests via `npm test`
- Confirm Home search input has explicit label
- Confirm assistant input has explicit label
- Confirm assistant closes on `Escape`

## Contrast review
Automated contrast in jsdom is limited. Before release, perform visual contrast checks in browser for:
- Home header texts and search field
- Rail titles/subtitles
- Compare CTA button text/background
- Assistant dialog title/body/action text

## Performance timing gate
- Start app locally: `npm run dev`
- Run `npm run perf:home`
- Review generated report at `docs/home-performance-report.json`
- Track and compare:
  - `railRender.medianMs`
  - `railRender.p95Ms`
  - `assistantOpen.medianMs`
  - `assistantOpen.p95Ms`

## Suggested threshold targets (v1)
- railRender p95 <= 2500ms
- assistantOpen p95 <= 800ms
