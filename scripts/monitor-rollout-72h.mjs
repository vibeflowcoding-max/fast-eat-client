import fs from 'node:fs';
import path from 'node:path';

const inputDir = process.argv[2];

if (!inputDir) {
  console.error('Usage: node scripts/monitor-rollout-72h.mjs <hourlyReportsDir>');
  process.exit(1);
}

const maxErrorRate = Number(process.env.DISCOVERY_ALERT_ERROR_RATE ?? 0.05);
const maxP95LatencyMs = Number(process.env.DISCOVERY_ALERT_P95_MS ?? 2500);
const minHours = Number(process.env.DISCOVERY_MONITOR_MIN_HOURS ?? 72);

const resolvedDir = path.resolve(process.cwd(), inputDir);
const files = fs
  .readdirSync(resolvedDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

const reports = files.map((file) => {
  const fullPath = path.join(resolvedDir, file);
  const content = fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, '').trim();
  return JSON.parse(content);
});

const observedHours = reports.length;
const breaches = reports.filter((report) =>
  (Number(report.errorRate) > maxErrorRate) || (Number(report.p95LatencyMs) > maxP95LatencyMs)
);

const summary = {
  generatedAt: new Date().toISOString(),
  observedHours,
  requiredHours: minHours,
  maxErrorRate,
  maxP95LatencyMs,
  breachCount: breaches.length,
  stableForRollout: observedHours >= minHours && breaches.length === 0
};

console.log(JSON.stringify(summary, null, 2));

if (!summary.stableForRollout) {
  process.exit(2);
}
