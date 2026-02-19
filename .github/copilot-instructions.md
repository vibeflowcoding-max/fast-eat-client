# fast-eat-client Copilot Instructions

## Development Visibility Rule (Mandatory)

- During active product building, **do not hide newly implemented user-facing features behind feature flags**.
- New UI/UX features must be **visible by default** so they can be reviewed immediately.
- If a feature flag already exists, keep compatibility in code only when needed, but the feature should still be enabled/rendered in development flows.
- Prefer always-on behavior for new features unless the user explicitly asks for gated rollout.

## Implementation Preference

- Prioritize testable, visible outcomes over rollout gating.
- If rollout controls are required later, add them after visual validation is complete.
