# Note on tests and linting
There are some existing tests and linting failures. Based on `memory.md`, we know:
- "Test failures may occur due to missing localized translation keys (e.g., English strings displaying instead of Spanish in the reviews widget due to next-intl). These UI test failures can be safely ignored if unrelated to the specific backend changes being made."
- The lint errors are unrelated to my changes in `OrderTrackingModal.tsx`.
