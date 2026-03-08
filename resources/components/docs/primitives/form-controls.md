# Form Controls

## Purpose

Standardizes radio groups, checkboxes, textareas, helper text, and validation states used in customization and future preference flows.

## Covered Controls

- Radio
- Checkbox
- Textarea
- Control label
- Supporting metadata row
- Helper and error text

## Rules

- Minimum control target: 44px.
- Labels own the click area.
- Required indicators use badge styling.
- Price modifiers align to the trailing edge.

## States

- default
- hover
- selected
- disabled
- error

## Behavior

- Primary action: change field value.
- Secondary action: show helper text or limits when constraints exist.
- Fallback: if option is unavailable, render disabled with explanation.
- Feedback: inline selected state, inline error copy, remaining selection count where relevant.
- Tracking: `field_impression`, `field_change`, `field_error`.