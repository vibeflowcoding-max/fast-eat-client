# Home Banners Behavior Spec (MVP)

Date: 2026-02-24
Scope: `DynamicPromoBanner` + `PredictivePrompt`

## Goals

- Improve clarity and conversion with whole-surface clickable banners.
- Keep dismiss behavior explicit and safe (`X` never triggers primary action).
- Provide graceful fallbacks when target data is incomplete or unavailable.
- Track banner effectiveness end-to-end.

## 1) DynamicPromoBanner (Red)

### Primary Action

- Clicking the banner surface applies promotions intent on Home (`activeIntent = promotions`).

### Secondary Action

- Clicking `X` dismisses only this banner for the current session (`sessionStorage`).

### Fallback

- If no click handler is available, keep banner visible and emit fallback analytics (`missing_target`).

### Feedback

- Loading: short skeleton/placeholder while promo copy is generated.
- Empty: do not render after loading if copy cannot be generated.

## 2) PredictivePrompt (Blue)

### Primary Action

- Clicking the banner surface attempts reorder action with `restaurantId + itemId`.

### Secondary Action

- Clicking `X` dismisses for the current session (`sessionStorage`).

### Fallbacks

- `itemId` or `restaurantId` missing: fallback action route (`onFallbackClick`) to discover alternatives.
- Offline: show offline message and route to fallback discovery action.
- API failure: show actionable message and fallback discovery action.

### Feedback

- Loading: visible loading card while prediction is fetched.
- Error: actionable fallback card with user-facing guidance.
- Empty: no card when no confident prediction.

## 3) Analytics Contract

### Event Names

- `home_banner_impression`
- `home_banner_click`
- `home_banner_dismiss`
- `home_banner_fallback_shown`
- `home_banner_conversion`

### Event Properties

- `banner_id`: `promo` | `predictive`
- `target_type`: `promo_intent` | `reorder` | `fallback_discovery`
- `dismiss_reason`: `user_close` | `session_restored`
- `fallback_type`: `missing_target` | `item_unavailable` | `offline` | `api_error`
- `conversion_type`: `visit_promotions` | `visit_restaurant`
- Optional: `restaurant_id`, `item_id`, `prediction_confidence`

## 4) Acceptance Criteria

- Banner surface is fully clickable in both banners.
- `X` close never triggers navigation or reorder.
- Dismiss state persists within current session.
- Predictive banner handles loading/error/offline/empty explicitly.
- Analytics events fire for impression, click, dismiss, fallback, conversion.
- No TypeScript diagnostics in touched files.
