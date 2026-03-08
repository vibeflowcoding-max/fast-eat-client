# Page Transition & Loading Time — Implementation Plan

**Project:** fast-eat-client  
**Date:** 2026-03-05  
**Status:** Pending approval

---

## Overview

This plan addresses 6 ranked bottlenecks found in the `fast-eat-client` codebase that contribute to slow page transitions and high time-to-interactive. Changes are safe, incremental, and ordered from lowest to highest risk.

---

## Bottleneck 1 — 🔴 CRITICAL: Serial request waterfall in `useAppData`

**File:** `src/hooks/useAppData.ts`

### Root Cause

4 API calls run sequentially — each waits for the previous to complete before starting:

1. `fetchRestaurantInfo(branchId)` → wait
2. `fetchTableQuantity(branchId)` → wait
3. `fetchMenuFromAPI(branchId)` → wait ← **this is the visible content**
4. `getCartFromN8N(...)` → wait

The menu (what the user must see first) is call #3. It cannot start until calls #1 and #2 both finish — even though #1 and #2 are completely independent of each other.

### Fix

Run calls #1 and #2 **in parallel** via `Promise.allSettled`, start call #3 immediately after, then call `setLoading(false)` right after the menu resolves. Fire call #4 as **fire-and-forget** so it never blocks the UI.

```ts
// Step A: parallel — independent calls
const [infoResult, tableResult] = await Promise.allSettled([
  fetchRestaurantInfo(branchId),
  fetchTableQuantity(branchId),
]);

// Process results
if (infoResult.status === 'fulfilled' && infoResult.value && isCurrentCycle()) {
  setRestaurantInfo(infoResult.value);
}
if (tableResult.status === 'fulfilled' && tableResult.value?.is_available) {
  setTableQuantity(tableResult.value.quantity);
}

// Step B: critical path — menu starts right after step A
const menuResult = await fetchMenuFromAPI(branchId);
setMenuItems(menuResult.items);
setCategories(/* ... */);
if (isCurrentCycle()) setLoading(false); // ← UI unblocks HERE

// Step C: fire-and-forget — never blocks UI
getCartFromN8N(branchId, fromNumber, isTestMode)
  .then(syncCart)
  .catch(console.error);
```

**Estimated gain:** ~40–60% reduction in restaurant page FCP (eliminates 2 serial round-trips from the critical path).

---

## Bottleneck 2 — 🔴 CRITICAL: Unoptimized images — no lazy loading

**Files:**
- `src/components/BranchSelectionModal.tsx` (line 61)
- `src/components/ItemDetailModal.tsx` (line 38)
- `src/components/ChatMessageList.tsx` (line 53)

### Root Cause

All `<img>` tags load eagerly with no lazy-loading, no size hints, and no async decoding. On a restaurant page with 20–50 menu items this causes a burst of image requests on mount, competing with critical API calls.

```tsx
// Current (unoptimized)
<img src={branch.image_url} className="w-16 h-16 rounded-xl object-cover" />
```

### Fix

Add `loading="lazy"`, `decoding="async"`, and explicit `width`/`height` to all off-screen images. For modal thumbnails, also add `fetchPriority="low"`.

```tsx
// Fixed
<img
  src={branch.image_url}
  alt={branch.name}
  loading="lazy"
  decoding="async"
  width={64}
  height={64}
  className="w-16 h-16 rounded-xl object-cover"
/>
```

**Estimated gain:** ~300–800ms on restaurant page initial render (defers non-visible image loads, reduces network contention).

---

## Bottleneck 3 — 🟠 HIGH: N dietary guardian fetches fire on menu render

**Files:**
- `src/components/MenuItemCard.tsx` (lines 25–28)
- `src/features/home-discovery/hooks/useDietaryGuardian.ts`

### Root Cause

Each `MenuItemCard` fires `checkItem(item)` in a `useEffect` on mount — 50 cards = 50 concurrent API checks immediately on render. The component is also not memoized, so any parent state change (e.g., adding to cart) re-renders all 50 cards.

### Fix 1 — `React.memo` with custom comparator

Wrap `MenuItemCard` with a comparator that only re-renders if the item ID, quantity, or highlight state changes:

```tsx
export default React.memo(MenuItemCard, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.currentQuantity === next.currentQuantity &&
  prev.isHighlighted === next.isHighlighted
);
```

### Fix 2 — Defer dietary guardian checks

Fire `checkItem` only after an idle window instead of immediately on mount:

```tsx
useEffect(() => {
  if (!isDietaryGuardianEnabled || !isActive || resultsMap[item.id] || loadingMap[item.id]) return;
  const id = requestIdleCallback(() => checkItem(item), { timeout: 2000 });
  return () => cancelIdleCallback(id);
}, [isDietaryGuardianEnabled, isActive, item.id]);
```

**Estimated gain:** Eliminates O(N) re-renders on every cart/state update; reduces initial network burst by deferring non-critical checks.

---

## Bottleneck 4 — 🟠 HIGH: `orders` and `search` pages are eagerly loaded

**Files:**
- `src/app/orders/page.tsx`
- `src/app/search/page.tsx`

### Root Cause

Both pages export their component directly — Next.js bundles them into the initial JS payload that all users download, even if they never visit those pages. The home page already uses `dynamic()` correctly as a reference.

### Fix

Wrap each page in a thin shell that uses `dynamic()` to lazy-import the heavy component. Move the current page logic into new component files.

```tsx
// src/app/orders/page.tsx (new thin shell)
"use client";
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const OrdersPageContent = dynamic(() => import('@/components/OrdersPageContent'), {
  loading: () => <LoadingScreen />,
});

export default function Orders() {
  return <OrdersPageContent />;
}
```

**New component files to create:**
- `src/components/OrdersPageContent.tsx` ← move current `orders/page.tsx` component logic here
- `src/components/SearchPageContent.tsx` ← move current `search/page.tsx` component logic here

**Estimated gain:** ~100–200ms removed from initial JS parse on first page load.

---

## Bottleneck 5 — 🟡 MEDIUM: Google Fonts blocking render

**File:** `src/app/layout.tsx` (line 35)

### Root Cause

`rel="stylesheet"` is render-blocking — the browser won't paint until this external CSS is downloaded. Every page is affected.

```html
<!-- Current (render-blocking) -->
<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet" />
```

### Fix

Add `preconnect` hints before the stylesheet link to start the DNS + TLS handshake earlier:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

> **Better alternative (optional):** Replace the `<link>` with Next.js `next/font/google` to self-host the font, eliminating the third-party network request entirely and removing the render-blocking concern.

**Estimated gain:** ~100–300ms FCP improvement.

---

## Bottleneck 6 — 🟡 MEDIUM: No image format optimization in `next.config.js`

**File:** `next.config.js`

### Root Cause

The `images` config only defines `remotePatterns` — no modern format negotiation (AVIF/WebP) and no responsive breakpoints. This means Next.js serves full-quality originals.

### Fix

Add `formats`, `deviceSizes`, and `imageSizes`:

```js
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [390, 640, 750, 828, 1080, 1200],
  imageSizes: [64, 128, 256],
  remotePatterns: [
    { protocol: 'https', hostname: 'images.unsplash.com' },
    { protocol: 'https', hostname: 'www.transparenttextures.com' },
  ],
},
```

> **Note:** `formats` only activates when `next/image` is used. Combined with the fix from Bottleneck 2, this creates a complete image optimization pipeline.

**Estimated gain:** ~20–50% reduction in image payload size per page.

---

## Files to Create / Modify

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/useAppData.ts` | Parallelize restInfo + tableQty; unblock loading after menu; fire cart sync as fire-and-forget |
| 2 | `src/components/BranchSelectionModal.tsx` | Add `loading="lazy" decoding="async"` to `<img>` |
| 3 | `src/components/ItemDetailModal.tsx` | Add `loading="lazy" decoding="async"` to `<img>` |
| 4 | `src/components/ChatMessageList.tsx` | Add `loading="lazy" decoding="async"` to `<img>` |
| 5 | `src/components/MenuItemCard.tsx` | Wrap with `React.memo` + custom comparator; defer dietary guardian via `requestIdleCallback` |
| 6 | `src/app/orders/page.tsx` | Replace with thin `dynamic()` shell |
| 7 | `src/components/OrdersPageContent.tsx` | **New file** — receives moved logic from `orders/page.tsx` |
| 8 | `src/app/search/page.tsx` | Replace with thin `dynamic()` shell |
| 9 | `src/components/SearchPageContent.tsx` | **New file** — receives moved logic from `search/page.tsx` |
| 10 | `src/app/layout.tsx` | Add `preconnect` hints for Google Fonts |
| 11 | `next.config.js` | Add `formats`, `deviceSizes`, `imageSizes` |

---

## Implementation Order (risk-ranked, safest first)

| Step | File(s) | Risk | Estimated Gain |
|------|---------|------|----------------|
| 1 | `layout.tsx` — add `preconnect` | 🟢 Zero | ~100–300ms FCP |
| 2 | `next.config.js` — image formats | 🟢 Zero | ~20–50% image size |
| 3 | `BranchSelectionModal`, `ItemDetailModal`, `ChatMessageList` — `loading="lazy"` | 🟢 Low | ~300–800ms render |
| 4 | `MenuItemCard` — `React.memo` | 🟢 Low | O(N) re-renders gone |
| 5 | `MenuItemCard` — defer dietary guardian | 🟡 Low | Reduces initial burst |
| 6 | `useAppData` — parallel requests + fire-and-forget cart | 🟡 Moderate | ~40–60% FCP reduction |
| 7 | `orders/page.tsx` + `search/page.tsx` — dynamic import refactor | 🟡 Moderate | ~100–200ms JS parse |

---

## Testing Checklist

- [ ] Restaurant page renders menu before cart sync completes
- [ ] Removing an item from cart does not cause full menu re-render (check React DevTools profiler)
- [ ] Orders page shows `LoadingScreen` skeleton during lazy load
- [ ] Search page shows `LoadingScreen` skeleton during lazy load
- [ ] Images in modals load lazily (visible in Network tab — no eager burst)
- [ ] Google Fonts preconnect visible in Network waterfall (earlier DNS resolve)
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint errors (`pnpm lint`)
