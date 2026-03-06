# Page Transition Performance - Implementation Feedback

Project: `fast-eat-client`  
Plan reviewed: `docs/plans/PAGE_TRANSITION_PERFORMANCE_PLAN.md`  
Review date: 2026-03-05

## Findings (Ordered by Severity)

No blocking findings in the current implementation against `docs/plans/PAGE_TRANSITION_PERFORMANCE_PLAN.md`.

Historical issues from the previous review were fixed:

1. `ItemDetailModal` image now includes lazy loading + async decoding + explicit dimensions.
Path: `src/components/ItemDetailModal.tsx:38`

2. `MenuItemCard` memo comparator now includes callback identity check, and `MainApp` now passes a memoized `onAddToCart` handler.
Paths: `src/components/MenuItemCard.tsx:216`, `src/components/MainApp.tsx:149`, `src/components/MainApp.tsx:982`

3. BOM marker removed from thin page shells.
Paths: `src/app/orders/page.tsx:1`, `src/app/search/page.tsx:1`

## Bottleneck-by-Bottleneck Status

1. Bottleneck 1 (`useAppData` request waterfall): Implemented
Paths: `src/hooks/useAppData.ts:43`, `src/hooks/useAppData.ts:97`
Verification: `Promise.allSettled` for parallel independent calls; menu unblocks loading before cart sync; cart sync moved to fire-and-forget promise chain.

2. Bottleneck 2 (image loading optimization): Implemented
Paths: `src/components/BranchSelectionModal.tsx:61`, `src/components/ChatMessageList.tsx:53`, `src/components/ItemDetailModal.tsx:38`
Verification: All target image tags include lazy loading and async decoding, with explicit `width`/`height`.

3. Bottleneck 3 (dietary guardian burst + card rerenders): Implemented
Path: `src/components/MenuItemCard.tsx:27`, `src/components/MenuItemCard.tsx:216`
Verification: `requestIdleCallback` defer added with fallback; component wrapped with `React.memo` comparator.

4. Bottleneck 4 (orders/search eager load): Implemented
Paths: `src/app/orders/page.tsx:5`, `src/app/search/page.tsx:5`, `src/components/OrdersPageContent.tsx`, `src/components/SearchPageContent.tsx`
Verification: Thin shells now use `dynamic()` with `LoadingScreen`; heavy page logic moved into dedicated components.

5. Bottleneck 5 (Google Fonts preconnect): Implemented
Path: `src/app/layout.tsx:36`
Verification: `preconnect` hints were added for `fonts.googleapis.com` and `fonts.gstatic.com` before stylesheet link.

6. Bottleneck 6 (Next image config): Implemented
Path: `next.config.js:4`
Verification: `formats`, `deviceSizes`, and `imageSizes` added under `images` config.

## Plan Coverage Summary

- Implemented: 6/6 bottlenecks fully
- Partial: 0/6 bottlenecks
- Missing: 0

## Verification Notes

- `LoadingScreen` import target exists at `src/components/LoadingScreen.tsx`.
- This review is based on unstaged diffs and targeted file checks.
- IDE diagnostics for the touched files reported no TypeScript/Problems-panel errors.
- Manual runtime verification items from the plan (network waterfall, profiler, visual lazy-load checks) are still recommended before merge.

## Follow-up Findings (2026-03-05)

1. Modal image optimization is still missing one plan detail: `fetchPriority="low"` was not added to the optimized image tags in `src/components/BranchSelectionModal.tsx:61` and `src/components/ItemDetailModal.tsx:38`, even though Bottleneck 2 explicitly called that out for modal thumbnails.

2. Manual runtime verification remains outstanding. The plan's browser-level checks for network waterfall behavior, React DevTools profiler validation, and visible lazy-load confirmation have not yet been recorded in this QA note.

## Recommended Follow-up

1. Run the full checklist from the plan in browser tooling (`React DevTools` profiler + Network waterfall checks).
2. Run repo quality gates before merge: `pnpm tsc --noEmit` and `pnpm lint`.
