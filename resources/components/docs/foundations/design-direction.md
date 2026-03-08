# Design Direction

## Product Posture

Fast Eat should feel like a mobile-first food marketplace with warmth, speed, and appetite appeal rather than a generic delivery dashboard.

## Direction Summary

- Tone: warm, direct, premium-casual
- Shape language: rounded but controlled, never overly soft
- Density: compact enough for commerce, breathable enough for discovery
- Contrast model: bright surfaces with strong text and a single hot accent
- Motion: short, informative, and tied to state change

## What We Keep From The Mocks

- Strong orange brand anchor
- Scroll-snap discovery rails
- Floating and sticky mobile controls
- Card-first browsing
- Rounded action bars and pill controls
- Clear section hierarchy

## What We Normalize

- One neutral family for text, border, and surfaces
- One dark theme surface stack instead of mixed custom browns and zinc blacks
- One icon size scale
- One spacing ladder
- One border treatment for controls and cards
- One CTA treatment for high-importance actions

## Canonical Visual Rules

### Color

- Brand accent stays orange.
- Promotional gradients may vary, but the app frame should not.
- Ratings, danger, and info use semantic tokens, not ad hoc utility colors.

### Typography

- Product UI default: Plus Jakarta Sans.
- Optional display accent: only for promo/editorial banners later if needed.
- Headings are bold, body copy is medium or regular, metadata stays compact.

### Layout

- Standard mobile frame width: 448px max.
- Major section spacing uses a fixed scale instead of arbitrary gaps.
- Sticky headers and fixed bottom bars must include blur, surface tint, and border separation.

### Interaction

- Touch targets must be at least 44px.
- Hover is supplemental, never the only affordance.
- Selected states rely on tint and border reinforcement, not only icon fill.

## New Standardized UI Theme

Name: Warm Market

Traits:

- App background: warm off-white in light mode, espresso-brown in dark mode
- Surfaces: creamy white and warm elevated browns
- Accent: orange with restrained gradient use
- Text: slate-driven semantic scale for readability
- Promotional areas: allowed to use campaign gradients, but only inside promo components

## Anti-Patterns To Avoid

- Mixing zinc and slate interchangeably
- Multiple dark surface recipes inside one screen
- Decorative gradients on core product UI chrome
- Icon sizes chosen ad hoc
- Inputs with different border and focus behavior depending on screen