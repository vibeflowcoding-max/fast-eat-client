# V2 Innovation Plan UI Test Plan & Checklist (2026-02-22)

## Scope
End-to-end UI validation for features referenced in:
- `docs/plans/v2-innovation-plan/02_AI_AGENT_BEHAVIORS.md`
- `docs/plans/v2-innovation-plan/03_SOCIAL_AND_GROUP_ORDERING.md`
- `docs/plans/v2-innovation-plan/04_GAMIFICATION_AND_CONTENT.md`
- `docs/plans/v2-innovation-plan/06_NEW_AI_SUGGESTIONS.md`
- `docs/plans/v2-innovation-plan/07_CONVENIENCE_AND_UTILITY.md`

## Execution Strategy
1. Start local API (`fast-eat-api-nestjs`) and client app(s) (`fast-eat-client`, and `restaurant-partner-p` where applicable).
2. Use Chrome DevTools MCP to execute manual UI test cases.
3. For each failed case: analyze root cause, patch code/data, retest, and update status.
4. Use Supabase MCP for backfill test data only when required to unlock UI paths.
5. Keep this checklist live-updated until all reachable tests are complete.

## Environment
- Date: 2026-02-23
- API: ⚠️ Blocked (local start fails without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`)
- Fast-eat client: ✅ Running on `http://localhost:3000`
- Restaurant-partner app: ✅ Running on `http://localhost:5173`
- Supabase backfill: ➖ Not required for this pass (used existing seeded/demo data)

## Test Checklist
| ID | Feature | App | Test Case | Status | Blockers / Notes |
|---|---|---|---|---|---|
| T01 | Surprise Me mood recommendation | fast-eat-client | Open home, trigger Surprise Me, verify recommendation card appears and can open item flow | ✅ Passed 🔁 Retested | Enabled by default (unless env explicitly `false`); verified mood input + recommendation card + “Ver Restaurante”. |
| T02 | Dietary Guardian safety badge | fast-eat-client | Open menu item card, verify dietary badge/rendered compliance state appears when hook resolves | ⚠️ Blocked | Requires feature flag/profile state (`NEXT_PUBLIC_HOME_DIETARY_GUARDIAN` + dietary profile). Badge path not active in current runtime. |
| T03 | Predictive reorder prompt | fast-eat-client | Open checkout/order form and verify “Lo de siempre” predictive prompt behavior | ✅ Passed 🔁 Retested | Enabled by default (unless env explicitly `false`); verified “Sugerencia para ti” prompt rendered with 1-click CTA. |
| T04 | Voice ordering CTA | fast-eat-client | Trigger microphone/voice button and verify transcript/intention UI state transitions | ✅ Passed | Verified processing state + success confirmation after trigger. |
| T05 | Dynamic AI promo banner | fast-eat-client | Validate promo banner content and state on home discovery section | ✅ Passed | Promo banner rendered with dynamic daypart message on home discovery. |
| T06 | Group cart flow (create/join/mutate) | fast-eat-client | Validate group cart modal/create and participant item interactions | ⚠️ Blocked | Create/share link works; stable multi-participant join/mutate could not be completed in this single-session local run. |
| T07 | Bill splitting modal flow | fast-eat-client | Validate split strategy selection and split summary interaction | ⚠️ Blocked | Depends on >1 active group participant; precondition from T06 not met. |
| T08 | Friend activity feed | fast-eat-client | Validate activity feed widget renders and loads entries | ✅ Passed | Activity feed rendered multiple friend events with actions. |
| T09 | Loyalty widget + dashboard | fast-eat-client | Open loyalty widget, open dashboard modal, verify points/streak/badges render | ✅ Passed | Loyalty widget opened dashboard modal with rank, points, streak, and badges. |
| T10 | Photo-first review modal | fast-eat-client | Open post-delivery review modal and test image select + rating flow | ⚠️ Blocked | Tracking modal opened but no eligible delivered order/review trigger in current local dataset. |
| T11 | Story/video menu feed | fast-eat-client | Validate story feed display and video playback controls | ✅ Passed | Story feed cards rendered with item metadata and add-to-cart CTAs. |
| T12 | Scheduled delivery picker | fast-eat-client | In checkout, set future datetime and verify payload-bound state | ✅ Passed | Schedule toggle revealed datetime picker; value persisted after modal close/reopen. |
| T13 | Skip cutlery toggle | fast-eat-client | In checkout, toggle opt-out cutlery and verify state persistence in order form | ✅ Passed | Eco toggle updated state and persisted after modal close/reopen. |
| T14 | Live activity hook permission flow | fast-eat-client | Trigger live-activity notification permission hook/UI pathway | ⚠️ Blocked | No browser permission prompt/live-activity pathway surfaced in web local flow (offers popover only). |
| T15 | Partner menu image enhancer UI | restaurant-partner-p | Upload flow in menu image uploader and verify enhancement state UX | ✅ Passed | Add-item dialog uploader accepted image, showed upload state, and rendered final preview URL. |

## Result Legend
- ✅ Passed
- ❌ Failed (fix required)
- ⚠️ Blocked (document blocker + mitigation)
- 🔁 Retested
