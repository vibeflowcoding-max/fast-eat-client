# Home Discovery Test Matrix

## What this document is for

Lists the core functional scenarios and expected outcomes to validate Home discovery behavior across environments.

## Scope
Regression checks for onboarding/search/filter/chat/checkout coexistence.

## Matrix

| Area | Scenario | Expected Result |
|---|---|---|
| Onboarding | New user opens Home | Onboarding modal appears and completion persists |
| Search | User types restaurant/category term | Rails reflect filtered restaurants only |
| Category | User selects and resets category | Restaurant set updates and resets correctly |
| Home assistant | User opens assistant and sends prompt | Response/fallback renders without blocking Home |
| Compare | Open from rail vs chat | `compare_open` and `compare_select` preserve source |
| Navigation | Click card / recommendation | App navigates to restaurant route |
| Checkout coexistence | Existing cart/checkout flow after Home discovery interactions | Checkout flow remains functional with no state corruption |

## Required manual environments
- Mobile viewport (375x812)
- Tablet viewport (768x1024)
- Desktop viewport (1440x900)
