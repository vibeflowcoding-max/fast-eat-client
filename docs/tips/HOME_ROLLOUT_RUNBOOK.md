# Home Discovery Rollout Runbook

## What this document is for

Gives the operational step-by-step process to run experiments, monitor stability, and decide rollout versus rollback safely.

## 1) Configure and run experiment

Generate local env preset:

```bash
npm run exp:run -- A
# or
npm run exp:run -- B
```

Copy generated env file into `.env.local` and run the app.

## 2) Alerting checks (error rate + latency)

Given exported discovery event logs with fields `name`, `status_code`, `latency_ms`:

```bash
npm run alerts:discovery -- ./ops/events-hour-01.ndjson > ./ops/hour-01-alert.json
```

Thresholds can be tuned with:

- `DISCOVERY_ALERT_ERROR_RATE` (default `0.05`)
- `DISCOVERY_ALERT_P95_MS` (default `2500`)

## 3) 72-hour monitoring gate

Store 1 JSON alert report per hour in one directory, then run:

```bash
npm run monitor:rollout-72h -- ./ops/hourly-alerts
```

This fails if:

- Less than 72 hourly reports are provided, or
- Any hour breaches error-rate or latency thresholds.

## 4) Experiment significance + rollout decision

```bash
npm run analyze:home-exp -- ./ops/events.ndjson > ./ops/analysis.json
npm run rollout:decision -- ./ops/analysis.json ./ops/monitor-summary.json > ./ops/decision.json
```

Rollout recommendation is `rollout` only when:

- 72h monitoring is stable, and
- checkout completion delta > 0, and
- p-value < 0.05.

## 5) Rollback

Rollback path:

1. Set `NEXT_PUBLIC_HOME_EXPERIMENT_CANARY_PERCENT=0`
2. Set `NEXT_PUBLIC_HOME_EXPERIMENT_BASELINE_VARIANT=control` (or last stable baseline)
3. Redeploy client configuration
4. Re-run alerting checks for next 2 hours to validate recovery
