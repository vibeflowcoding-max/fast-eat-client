# Home Experiment Analysis

## What this document is for

Explains how to analyze Home A/B experiment data and interpret significance outputs to make rollout or rollback decisions.

## Purpose

This guide explains how to analyze Home A/B experiment performance from exported analytics events.

## Input format

Use either:

- JSON array of event objects, or
- NDJSON (one JSON event per line)

Each event should include:

- `experiment_id`
- `variant_id`
- `name`

Recommended event names for conversion analysis:

- `home_view`
- `rail_item_click`
- `add_to_cart_from_home`
- `checkout_start`
- `checkout_complete`

## Run

```bash
npm run analyze:home-exp -- ./path/to/home-events.ndjson
```

The script outputs JSON with:

- per-variant counts
- per-variant rates (`CTR`, add-to-cart, checkout start/completion)
- two-proportion z-test estimate (first two variants)

## Rollout recommendation heuristic

For the primary decision metric (`checkout_completion_rate`):

- Prefer candidate when absolute delta > 0 and `p_value < 0.05`
- If `p_value >= 0.05`, continue experiment until more traffic accumulates
- If delta < 0, keep control and review segment-level breakdowns

## Notes

- Current significance output compares only the first two sorted variants.
- The script uses event counts with `home_view` as denominator.
- For final production decisions, complement with session-level deduping and guardrail metrics.
