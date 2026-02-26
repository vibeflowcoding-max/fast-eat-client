# fast-eat-client Copilot Instructions

## Development Visibility Rule (Mandatory)

- **Mandatory planning gate:** Before any code change (create/edit/delete), always create a detailed implementation plan and show it to the user first.
- **Plan content requirement:** The plan must include a review and analysis of the code that will be modified, plus ideas and suggestions for the proposed changes.
- Do not perform any code changes until that detailed plan has been presented to the user in the response.
- **Explicit approval required:** After presenting the plan, the agent must stop and wait for explicit user approval before doing any further work.
- **No execution before approval:** Until the user explicitly approves the plan, do not run tools, execute commands, edit/create/delete files, or apply patches.
- **Approval format:** Proceed only after a clear approval message from the user (for example: "approved", "go ahead", "implement", or equivalent explicit confirmation).
- **Plan-file addendum:** If the user already provides plan files, or files that already contain an execution plan in the request context, treat that as explicit implementation authorization. In that case, still present the implementation plan, but do not ask for an additional approval message before implementing.
- During active product building, **do not hide newly implemented user-facing features behind feature flags**.
- New UI/UX features must be **visible by default** so they can be reviewed immediately.
- If a feature flag already exists, keep compatibility in code only when needed, but the feature should still be enabled/rendered in development flows.
- Prefer always-on behavior for new features unless the user explicitly asks for gated rollout.

## Implementation Preference

- Prioritize testable, visible outcomes over rollout gating.
- If rollout controls are required later, add them after visual validation is complete.

## Behavior-First Rule (Mandatory)

- Before implementing or restyling any interactive UI (banners, cards, chips, CTAs, toasts, modals), define behavior first.
- Behavior definition must include:
	- Primary action on click/tap.
	- Secondary action (dismiss/close) when applicable.
	- Fallback behavior when data, target entity, or permissions are missing.
	- Success/error user feedback expectations.
	- Tracking events (at minimum: impression, click, dismiss, conversion when relevant).
- If behavior is ambiguous, ask one precise question first, then proceed with sensible defaults.
- Avoid decorative-only interactive affordances (for example, arrows/icons that imply an action not aligned with the actual click target).
- Prefer whole-surface click targets for compact banners/cards when that improves clarity, while preserving an explicit close action.

## Verification Rule (Mandatory)

- Whenever you implement a new API endpoint, or any new/updated visual UI component (buttons, views, forms, fields, banners, cards, modals, or similar), you must verify behavior after implementation.
- For visual/UI work, validate with `chrome-devtools-mcp` that the component renders and behaves according to what was defined during planning.
- For endpoint work, use Supabase MCP tools to confirm either:
	- The endpoint writes/reads the expected data in the database, or
	- The database already contains enough realistic data to test the endpoint flow.
- If there is not enough information/data to validate correctly, report that clearly to the user and wait for user input before continuing.
