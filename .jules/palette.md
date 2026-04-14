## 2024-04-14 - OrderTrackingModal accessibility enhancement
**Learning:** Found a missing aria-label in a standalone close '✕' button in `OrderTrackingModal.tsx`. Icon-only buttons lacking aria-labels cause accessibility issues for screen readers. Added a `closeAria` key to the i18n files (`messages.json`) and updated the modal to use it.
**Action:** When implementing standalone icon-only buttons (like '✕' or SVG icons), always double-check and add descriptive `aria-label`s. Ensure that translation keys are also propagated across supported locales.
