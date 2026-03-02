# Fast Eat Client — Translation Implementation Plan

Last updated: 2026-02-25
Scope: `fast-eat-client` full app UI + profile language setting

## 1) Current State Analysis (Codebase Audit)

### 1.1 i18n status today
- No existing i18n framework found in `src/` (no `next-intl`, `next-i18next`, `react-intl`, or translation hooks).
- `<html lang="es">` is hardcoded in `src/app/layout.tsx`.
- UI copy is primarily hardcoded Spanish strings directly in components/pages.

### 1.2 High-impact copy surfaces identified
- **App shell / navigation**
  - `src/app/layout.tsx` (metadata title/description + html lang)
  - `src/components/BottomNav.tsx` (Inicio/Buscar/Pedidos/Perfil)
  - `src/components/Navbar.tsx` (aria labels and action labels)
- **Auth**
  - `src/app/auth/sign-in/page.tsx`
  - `src/app/auth/sign-up/page.tsx`
  - `src/app/auth/callback/page.tsx`
- **Profile and user settings candidate**
  - `src/app/profile/page.tsx` (best location to add language setting)
- **Home and discovery**
  - `src/components/HomePage.tsx`
  - `src/components/*` and `src/features/home-discovery/components/*`
- **Ordering/cart/feedback states**
  - `src/components/MainApp.tsx`, `CartModal.tsx`, `OrderForm.tsx`, `OrderTrackingModal.tsx`, etc.

### 1.3 Architectural constraint
- Project uses Next.js App Router with client-heavy UI state and Zustand store (`src/store.ts`).
- Migration to full route-segment locale prefixes (`/en/...`) is possible, but not required for first iteration.

---

## 2) Target Solution

## 2.1 Translation strategy
Implement app-level translation with:
- `next-intl` (App Router compatible)
- Message dictionaries per locale (JSON files)
- A thin locale state layer in Zustand + persistence to localStorage
- Optional profile sync endpoint later for cross-device persistence

Recommended locales for phase 1:
- `es-CR` (default)
- `en-US`

### 2.2 Proposed folder structure
- `src/i18n/config.ts` (supported locales, default locale)
- `src/i18n/request.ts` (server/client locale resolution)
- `src/messages/es-CR/*.json`
- `src/messages/en-US/*.json`
- `src/components/providers/LocaleProvider.tsx` (if needed for client context bridge)
- `src/hooks/useAppLocale.ts` (wrapper for locale read/update)

### 2.3 Key decision
- **Phase 1 uses non-prefixed URL locale** (no `/en/...` routes).
- Locale is selected by user and persisted, and all copy updates live without URL changes.
- This keeps migration low-risk and avoids route breakage.

---

## 3) Behavior Definition (Mandatory)

Feature: **Language setting in Profile menu/page**

### 3.1 Primary action
- User selects a language option (`Español`, `English`) from a `Select` in profile settings.
- App immediately updates locale and rerenders translated content.

### 3.2 Secondary action
- User can cancel/close profile settings page normally (no modal required).
- No explicit Save button required in phase 1 (auto-save on select).

### 3.3 Fallback behavior
- If stored locale is missing/invalid → fallback to `es-CR`.
- If a key is missing in selected locale → fallback to `es-CR` key, then to key name.
- If profile API for locale sync is unavailable → keep local persistence and continue.

### 3.4 Success/error feedback
- Success: subtle toast or inline message: “Idioma actualizado” / “Language updated”.
- Error (only when remote sync enabled): show non-blocking warning and keep local locale.

### 3.5 Tracking events
At minimum:
- `language_setting_impression` (profile setting visible)
- `language_changed` (from_locale, to_locale, source=`profile_settings`)
- `language_change_failed` (if server sync fails)

---

## 4) Detailed Implementation Plan

## Phase A — Infrastructure
1. Install and configure `next-intl`.
2. Add locale config (`es-CR`, `en-US`) and default fallback.
3. Wire provider in `src/app/layout.tsx`.
4. Move metadata strings to message dictionary usage where possible.
5. Keep `lang` attribute dynamic from active locale.

## Phase B — Translation domains and dictionaries
Create message domains to avoid one giant file:
- `common.json` (generic buttons/labels/errors)
- `nav.json` (bottom nav, top nav)
- `auth.json` (sign-in/sign-up/callback)
- `profile.json` (profile page + new language section)
- `home.json` (home and discovery headers/chips)
- `orders.json` (cart, checkout, tracking)

## Phase C — Profile language setting
1. Add settings section in `src/app/profile/page.tsx`:
   - Label: `Idioma / Language`
   - Selector options: `Español (Costa Rica)`, `English (US)`
2. Persist in Zustand (`src/store.ts`) and localStorage.
3. Trigger app-wide rerender/localization update.
4. Add event tracking.

## Phase D — Incremental UI migration
Migrate in priority order:
1. Auth flow (`src/app/auth/*`)
2. App navigation (`BottomNav`, `Navbar`, shell strings)
3. Profile page and prompts
4. Home/discovery components
5. Ordering/cart/tracking components
6. Remaining feature modules (social, gamification, reviews)

## Phase E — API and data text boundaries
- Do not translate server-returned user content (restaurant names, user notes).
- Translate only client-owned UI labels and static/descriptive text.
- Keep error mapping layer: backend errors -> translatable user-facing messages.

---

## 5) File-Level Change Map (Planned)

Core setup:
- `src/app/layout.tsx`
- `src/store.ts`
- `src/i18n/config.ts` (new)
- `src/i18n/request.ts` (new)
- `src/messages/es-CR/*.json` (new)
- `src/messages/en-US/*.json` (new)

Profile setting:
- `src/app/profile/page.tsx`

Initial migration batch:
- `src/components/BottomNav.tsx`
- `src/components/Navbar.tsx`
- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/components/HomePage.tsx`

---

## 6) Testing Plan

### 6.1 Unit/Component tests (Vitest + RTL)
- `useAppLocale` / locale store persistence.
- Profile language selector changes locale and persists.
- Fallback behavior for invalid locale/missing keys.

### 6.2 Integration checks
- Switch language from profile -> verify immediate updates on:
  - bottom nav labels
  - auth page labels
  - profile headings/descriptions
- Reload browser -> language remains selected.

### 6.3 Browser QA (chrome-devtools-mcp)
- Validate profile setting UI and keyboard accessibility.
- Confirm no layout regressions due to longer English labels.
- Confirm language switch does not reset auth/cart state.

---

## 7) Rollout Plan

## Milestone 1 (MVP)
- Infrastructure + profile language setting + auth/nav/profile translations.

## Milestone 2
- Home/discovery + order/cart/tracking translation coverage.

## Milestone 3
- Remaining feature modules + cleanup of hardcoded strings.
- Add CI check/script to detect new hardcoded strings in critical folders.

---

## 8) Risks and Mitigations

- **Risk:** Huge string surface and regression risk.
  - **Mitigation:** domain-based migration and per-module PRs.
- **Risk:** Missing keys at runtime.
  - **Mitigation:** fallback chain + dev warning logs.
- **Risk:** Inconsistent language from backend messages.
  - **Mitigation:** map backend error codes to localized client messages.

---

## 9) Definition of Done

- User can change language from profile settings.
- Selection persists across reloads and sessions.
- Auth, nav, profile, and primary home copy are translated in `es-CR` and `en-US`.
- No blocking UI copy remains hardcoded in those MVP modules.
- Tests pass and browser QA confirms expected behavior.
