# Plan 04.02 — Price Optimization Prompt

## Objective

Offer users a non-intrusive lower-cost alternative before checkout when meaningful savings exist.

## Scope

- Pre-checkout optimization prompt card.
- Compare-driven recommendation for same/similar basket at lower final total.

## Prompt Rules (v1)

- Show only when:
  - savings >= configured threshold (e.g., 8%)
  - recommendation confidence above minimum threshold
- Hide if user dismisses prompt in current session.

## Implementation Plan

1. Build cart-context compare request payload.
2. Query compare endpoint asynchronously before checkout confirmation step.
3. Render compact prompt with:
   - estimated savings
   - compare/open actions
4. Track acceptance, dismissal, and conversion outcomes.

## Files

- `src/app/api/discovery/compare/route.ts`
- `src/features/home-discovery/services/discoveryClient.ts`
- checkout-related UI components

## Analytics

- `price_optimization_prompt_impression`
- `price_optimization_prompt_accept`
- `price_optimization_prompt_dismiss`

## Testing

- Prompt eligibility tests.
- Prompt action tests (accept/dismiss).
- Regression tests for uninterrupted checkout path.

## Rollout

- Feature flag: `checkout_price_optimization_prompt_v1`.
- Canary first; monitor checkout completion and time-to-checkout.

## Risks & Mitigations

- Risk: prompt causes friction.
  - Mitigation: strict threshold + non-blocking placement.

## Definition of Done

- Prompt appears only in high-value savings cases.
- User can proceed checkout without forced interaction.
- Net positive impact on conversion or AOV.

## Implementation Checklist

- [ ] Finalize savings threshold and confidence threshold rules.
- [ ] Build compare payload from current cart context.
- [ ] Add non-blocking pre-checkout prompt UI.
- [ ] Add accept/dismiss analytics and attribution.
- [ ] Add tests for eligibility and prompt actions.
- [ ] Ensure checkout can proceed without prompt interaction.
- [ ] Roll out behind `checkout_price_optimization_prompt_v1`.
