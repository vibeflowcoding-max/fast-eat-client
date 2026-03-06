# Option Group

## Purpose

Groups customization choices such as buns, add-ons, removals, and future dietary preferences.

## Anatomy

- Group title
- Optional rules text
- Optional requirement badge
- List of options
- Optional helper or validation text

## Supported Modes

- single-select
- multi-select
- destructive remove list

## Behavior

- Primary action: select or deselect one or more options.
- Secondary action: show limit, required, or pricing guidance.
- Fallback: unavailable options render disabled with explanation.
- Feedback: selected state updates instantly; limit violations show inline message.
- Tracking: `option_group_impression`, `option_selected`, `option_deselected`, `option_group_error`.