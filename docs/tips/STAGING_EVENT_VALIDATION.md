# Staging Event Validation Guide

## What this document is for

Describes how to verify analytics payload correctness in staging before enabling new Home discovery behavior in production.

## Objective
Verify Home analytics payloads in a staging dashboard or browser event stream before rollout.

## Events to validate
- home_view
- intent_chip_click
- home_search_input
- category_filter_click
- rail_impression
- rail_item_click
- compare_open
- compare_select
- home_chat_open
- home_chat_query
- home_chat_recommendation_click
- home_chat_quick_prompt_click
- home_chat_followup_click

## Validation checklist
- Open Home and confirm `home_view` event appears.
- Click one intent chip and confirm `intent_chip_click` payload contains `chip`.
- Type in search and confirm `home_search_input` payload contains `query_length`.
- Change category and confirm `category_filter_click` includes `category_id`.
- Confirm rail impression and rail item click payloads include rail metadata.
- Open compare from rail and chat and confirm source values are preserved.
- Open assistant, send prompt, click recommendation, click follow-up and validate payload shapes.

## Suggested staging filter dimensions
- experiment_id
- variant_id
- strategy_version
- geo_bucket
- session_type

## Evidence format for signoff
- Timestamped dashboard screenshots or exported event rows
- Event sample payloads for each required event name
- Any rejected payloads and remediation notes
