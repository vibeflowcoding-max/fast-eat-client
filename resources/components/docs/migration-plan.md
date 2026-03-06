# Migration Plan

## Goal

Implement the standardized resource system into the app without carrying over inconsistencies from the mock HTML files.

## Recommended Order

1. Add semantic tokens to the app theme layer using `tokens.json` or `tokens.css` as the source of truth.
2. Implement primitives in `src/components/ui` or the equivalent design-system location.
3. Implement composites for cards, banners, selectors, and option groups.
4. Refactor or build screens using patterns rather than screen-specific one-offs.
5. Add loading, error, and empty states for every data-driven section.
6. Add interaction tracking once component interfaces stabilize.

## Standardization Decisions

- Use the orange brand as the only global accent.
- Replace zinc-specific card surfaces with the neutral semantic scale.
- Use one dark surface ladder: `inverse-app`, `inverse-base`, `inverse-raised`, `inverse-hover`.
- Keep promo gradients isolated to Promo Banner and campaign modules.
- Keep Plus Jakarta Sans as the app default font.

## Risks To Avoid During Implementation

- Re-creating utility-class drift from the static mocks
- Baking business text directly into primitives
- Skipping empty and error states because the mocks did not show them
- Overusing gradients outside promotional content

## Suggested Future Directories In `src`

- `src/components/ui/primitives`
- `src/components/ui/composites`
- `src/components/ui/patterns`
- `src/styles/tokens`

## Verification Checklist For Later App Work

- Buttons and tabs have visible focus states.
- All touch targets meet minimum size.
- Horizontal rails remain discoverable on touch devices.
- Bottom bars respect safe area insets.
- Selection controls expose errors and constraints clearly.
- Dark mode uses the semantic surface ladder consistently.