import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/check-discovery-alerts.mjs <events.ndjson|events.json>');
  process.exit(1);
}

function parseEvents(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const alertErrorRate = Number(process.env.DISCOVERY_ALERT_ERROR_RATE ?? 0.05);
const alertP95LatencyMs = Number(process.env.DISCOVERY_ALERT_P95_MS ?? 2500);

const resolved = path.resolve(process.cwd(), inputPath);
const raw = fs.readFileSync(resolved, 'utf-8');
const events = parseEvents(raw);

const discoveryEvents = events.filter((event) => String(event.name || '').startsWith('discovery_'));
const total = discoveryEvents.length;
const failed = discoveryEvents.filter((event) => Number(event.status_code || 200) >= 500).length;

const latencies = discoveryEvents
  .map((event) => Number(event.latency_ms))
  .filter((value) => Number.isFinite(value) && value >= 0)
  .sort((a, b) => a - b);

const p95Idx = latencies.length === 0 ? 0 : Math.ceil(latencies.length * 0.95) - 1;
const p95Latency = latencies.length === 0 ? 0 : latencies[Math.max(0, p95Idx)];
const errorRate = total === 0 ? 0 : failed / total;

const result = {
  generatedAt: new Date().toISOString(),
  totalEvents: total,
  failedEvents: failed,
  errorRate,
  p95LatencyMs: p95Latency,
  thresholds: {
    maxErrorRate: alertErrorRate,
    maxP95LatencyMs: alertP95LatencyMs
  },
  alerts: {
    errorRateBreached: errorRate > alertErrorRate,
    latencyBreached: p95Latency > alertP95LatencyMs
  }
};

console.log(JSON.stringify(result, null, 2));

if (result.alerts.errorRateBreached || result.alerts.latencyBreached) {
  process.exit(2);
}
