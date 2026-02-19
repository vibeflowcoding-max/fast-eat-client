# Plan 03.01 — Rich Assistant Recommendation Cards

## Objective

Make assistant answers more actionable and trustworthy by improving recommendation card clarity and explainability.

## Scope

- Richer card body for assistant recommendations.
- Inline reason tags and confidence hints.
- Strong CTA layout for open restaurant / compare.

## UX Enhancements

- Card header: title + short subtitle.
- Metadata chips: ETA, estimated final price, promo hint.
- Reason list: 1–3 concise explanations.
- CTA row: `View Restaurant` + `Compare` when available.

## Implementation Plan

1. Extend response handling to include explainability fields from API.
2. Update card rendering in `HomeDiscoveryWidget`.
3. Add robust fallback rendering when fields are missing.
4. Keep component lightweight and mobile-friendly.

## Files

- `src/features/home-discovery/components/HomeDiscoveryWidget.tsx`
- `src/features/home-discovery/hooks/useHomeDiscoveryChat.ts`
- `src/app/api/discovery/chat/route.ts`

## Analytics

- `home_chat_recommendation_card_impression`
- `home_chat_recommendation_click`
- `home_chat_compare_click`

## Testing

- Component tests for:
  - full payload
  - partial payload fallback
  - compare CTA available/unavailable

## Rollout

- Feature flag: `home_assistant_cards_v2`.
- Start with canary cohort only.

## Definition of Done

- Recommendation cards expose reasons and key metadata.
- CTA interactions remain stable and trackable.
- No UI breakage on malformed/partial assistant payloads.

## Implementation Checklist

- [ ] Confirm required assistant card fields with API contract.
- [ ] Implement rich card structure with metadata and reasons.
- [ ] Add resilient fallback rendering for partial payloads.
- [ ] Validate compare CTA behavior and routing.
- [ ] Emit card impression/click analytics.
- [ ] Add component tests for full and partial responses.
- [ ] Run canary behind `home_assistant_cards_v2`.
