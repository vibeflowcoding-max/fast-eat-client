# Plan 03.02 — Context-Aware Quick Prompts

## Objective

Increase assistant engagement quality by showing prompt chips relevant to user context (intent, location, budget, current state).

## Scope

- Dynamic quick prompt generation logic.
- Prompt personalization from current Home state.
- Analytics for prompt effectiveness by context.

## Prompt Context Inputs

- Active Home intent.
- Presence/absence of location.
- Last assistant response type.
- Optional budget/ETA constraints.

## Implementation Plan

1. Build prompt generator utility with deterministic rule set.
2. Inject context into `HomeDiscoveryWidget` prompt rendering.
3. Keep fallback prompt set when no context is available.
4. Track clicks with context metadata.

## Files

- `src/features/home-discovery/components/HomeDiscoveryWidget.tsx`
- `src/features/home-discovery/types.ts`
- `src/features/home-discovery/analytics.ts`

## Analytics

- `home_chat_quick_prompt_impression`
- `home_chat_quick_prompt_click`
- additional dimensions: `active_intent`, `has_location`

## Testing

- Unit tests for prompt generator rules.
- UI tests for context switch and fallback behavior.

## Rollout

- Feature flag: `home_assistant_dynamic_prompts_v1`.
- Compare conversation completion and recommendation click rate.

## Definition of Done

- Prompt set changes according to context rules.
- Prompt interactions are fully instrumented.
- No regressions for keyboard/screen-reader prompt usage.

## Implementation Checklist

- [ ] Define context inputs and prompt generation rules.
- [ ] Implement prompt generator utility with fallback set.
- [ ] Wire context into widget prompt rendering.
- [ ] Add analytics dimensions (`active_intent`, `has_location`).
- [ ] Add tests for context switching and fallback behavior.
- [ ] Validate accessibility for dynamic prompt chips.
- [ ] Roll out behind `home_assistant_dynamic_prompts_v1`.
