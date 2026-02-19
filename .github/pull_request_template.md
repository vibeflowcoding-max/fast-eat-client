## Summary
- What changed?
- Why?

## Home Discovery PR Checklist
- [ ] Components stay pure/idempotent (no render side effects)
- [ ] State is minimal and derived where possible
- [ ] No redundant `useEffect` for pure data transformations
- [ ] New async UI includes Loading + Error + Empty + Success states
- [ ] Keyboard/focus behavior verified for new interactive controls
- [ ] Reduced-motion behavior considered for new animations
- [ ] Event payloads follow HOME_DISCOVERY_EVENT_CONTRACT

## Architecture Gate (`use client`)
- [ ] New `"use client"` boundaries are justified and kept low in tree
- [ ] Bundle impact for new client-side dependencies is acceptable

## Home Regression Watchlist
- [ ] Onboarding, search, category filtering unaffected
- [ ] Navigation Home -> restaurant unaffected
- [ ] Home assistant and restaurant chat contexts remain isolated
- [ ] Compare source analytics (`rail|chat`) verified

## Test Plan
- [ ] Manual test steps included
- [ ] Relevant unit/integration coverage added or updated
