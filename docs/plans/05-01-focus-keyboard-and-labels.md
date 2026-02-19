# Plan 05.01 — Focus, Keyboard, and Labels

## Objective

Guarantee full keyboard accessibility and robust focus behavior across Home discovery, assistant, and compare flows.

## Scope

- Keyboard path validation for all interactive controls.
- Focus ring and tab-order consistency.
- Label and ARIA coverage for dynamic controls.

## Implementation Plan

1. Build interaction inventory for Home + assistant + compare.
2. Ensure each control has:
   - visible focus style
   - descriptive accessible name
   - predictable tab order
3. Add focus management for dialog/sheet open-close transitions.
4. Patch missing ARIA relationships only where semantics are insufficient.

## Files

- Home discovery components
- assistant components
- compare sheet components
- existing a11y test files

## Testing

- Expand keyboard behavior tests for chips, rails, dialog actions.
- Re-run a11y suite and targeted screen-reader label checks.

## Acceptance Criteria

- Keyboard-only user can complete discovery + compare path.
- Focus never gets lost when opening/closing overlays.
- Interactive controls have explicit labels.

## Rollout

- Can ship directly if low-risk; otherwise behind `home_a11y_focus_v1`.

## Definition of Done

- All modified controls pass keyboard tests.
- A11y checks pass in CI.
- No regressions in interaction flows.

## Implementation Checklist

- [ ] Build complete interactive control inventory.
- [ ] Verify explicit labels and accessible names.
- [ ] Ensure visible focus states for all controls.
- [ ] Validate tab order and dialog focus traps.
- [ ] Add/extend keyboard interaction tests.
- [ ] Run a11y suite and fix violations.
- [ ] Ship with or without `home_a11y_focus_v1` flag based on risk.
