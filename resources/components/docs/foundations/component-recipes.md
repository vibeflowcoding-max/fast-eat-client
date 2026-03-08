# Component Recipes

These recipes standardize how repeated visual styles should be implemented later in React and Tailwind.

## Surface Recipes

### App Shell Surface

- Light: `surface-app`
- Dark: `surface-inverse-app`
- Usage: body background, app frame, fixed chrome

### Card Surface

- Light: `surface-base`
- Dark: `surface-inverse-base`
- Border: `border-subtle` or `border-inverse-subtle`
- Shadow: `shadow-card`

### Interactive Muted Surface

- Light: `surface-muted`
- Dark: `surface-inverse-hover`
- Usage: quantity selectors, icon buttons, muted states

## Border Recipes

- Standard card and control border: `border-subtle`
- Emphasized hover border: `border-accent`
- Focus ring: brand primary at 2px
- Danger checkbox focus: feedback danger at 2px

## CTA Recipes

### Primary CTA

- Background: `brand-primary`
- Text: inverse primary
- Radius: pill for key mobile actions
- Shadow: `shadow-cta`
- State shift: darken background on hover and press

### Secondary CTA

- Background: `brand-primary-soft`
- Text: `brand-primary`
- Border: none unless used on complex surfaces

## Typography Recipes

### Hero Copy

- Font size: hero or headline
- Weight: bold
- Limit to promotional banners and item titles with high business value

### Section Titles

- Font size: title
- Weight: bold
- Color: text primary

### Meta Rows

- Font size: body-sm or caption
- Weight: medium
- Color: text secondary or muted

## Motion Recipes

- Hover and tap transitions: 150ms to 200ms
- Entry and section reveal: 200ms to 300ms
- Disable nonessential motion under reduced-motion settings

## State Recipes

- Selected: border accent + subtle brand tint + stronger text
- Disabled: reduce contrast, remove shadow, keep readable labels
- Loading: skeleton or pulse; never blank space
- Empty: explain next step with a single focused CTA
- Error: inline message + retry path when action failed