# Home Discovery Event Contract

## What this document is for

Defines the source-of-truth analytics event names, payload fields, and validation rules for Home discovery so product, frontend, backend, and analytics stay aligned.

## Scope
Analytics events emitted by Home discovery UX (`src/features/home-discovery/analytics.ts`).

## Event list
- `home_view`
- `intent_chip_click`
- `home_search_input`
- `category_filter_click`
- `rail_impression`
- `rail_item_click`
- `compare_open`
- `compare_select`
- `home_chat_open`
- `home_chat_query`
- `home_chat_recommendation_click`
- `home_chat_quick_prompt_click`
- `home_chat_followup_click`

## Payload contract

## Shared dimensions (auto-attached)

All Home discovery events include these dimensions by default (unless explicitly overridden by caller):

```json
{
  "experiment_id": "home_discovery_variant_v1",
  "variant_id": "control|intent_first|rails_only|rails_assistant",
  "geo_bucket": "optional-segmentation-label",
  "session_type": "new|returning"
}
```

### Recommended experiment mappings

- Experiment A (`home_discovery_exp_a`)
  - `control` = legacy list layout (nearby + remaining restaurants)
  - `intent_first` = intent chips + curated rails
- Experiment B (`home_discovery_exp_b`)
  - `rails_only` = rails without home assistant
  - `rails_assistant` = rails + home assistant

### home_view
```json
{
  "name": "home_view",
  "experiment_id": "optional",
  "variant_id": "optional",
  "geo_bucket": "optional",
  "session_type": "new | returning"
}
```

### intent_chip_click
```json
{ "name": "intent_chip_click", "chip": "cheap|fast|healthy|family_combo|promotions|best_rated" }
```

### home_search_input
```json
{ "name": "home_search_input", "query_length": 8 }
```

### category_filter_click
```json
{ "name": "category_filter_click", "category_id": "optional-category-id-or-null" }
```

### rail_impression
```json
{ "name": "rail_impression", "rail_id": "string", "item_count": 8 }
```

### rail_item_click
```json
{ "name": "rail_item_click", "rail_id": "string", "restaurant_id": "string", "rank": 1 }
```

### compare_open / compare_select
```json
{ "name": "compare_open", "source": "rail|chat" }
```
```json
{ "name": "compare_select", "source": "rail|chat" }
```

### home_chat_open / home_chat_query
```json
{ "name": "home_chat_open" }
```
```json
{ "name": "home_chat_query" }
```

### home_chat_recommendation_click
```json
{ "name": "home_chat_recommendation_click", "trace_id": "optional" }
```

### home_chat_quick_prompt_click / home_chat_followup_click
```json
{ "name": "home_chat_quick_prompt_click", "label": "Algo barato para hoy" }
```
```json
{ "name": "home_chat_followup_click", "label": "¿Quieres comparar opciones?" }
```

## Validation rules
- Unknown fields should be ignored by downstream consumers.
- Required fields per event must be present.
- `source` must be `rail` or `chat`.
- `rank` is 1-based.
- `item_count` must be >= 0.
- `query_length` must be >= 0.

## Analysis tooling

- Use [HOME_EXPERIMENT_ANALYSIS.md](./HOME_EXPERIMENT_ANALYSIS.md) for experiment performance analysis and rollout guidance.
- Script command: `npm run analyze:home-exp -- ./path/to/events.ndjson`
