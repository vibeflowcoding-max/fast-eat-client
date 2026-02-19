import fs from 'node:fs';
import path from 'node:path';

const analysisPath = process.argv[2];
const monitorPath = process.argv[3];

if (!analysisPath || !monitorPath) {
  console.error('Usage: node scripts/generate-rollout-decision.mjs <analysis.json> <monitor.json>');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), analysisPath), 'utf-8').replace(/^\uFEFF/, '').trim());
const monitor = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), monitorPath), 'utf-8').replace(/^\uFEFF/, '').trim());

const completion = analysis?.significance?.checkout_completion_rate;
const delta = Number(completion?.delta ?? 0);
const pValue = Number(completion?.p_value ?? 1);

const recommendRollout = monitor.stableForRollout && delta > 0 && pValue < 0.05;

const decision = {
  generatedAt: new Date().toISOString(),
  experiment_id: analysis.experiment_id,
  stableForRollout: Boolean(monitor.stableForRollout),
  checkoutDelta: delta,
  checkoutPValue: pValue,
  recommendation: recommendRollout ? 'rollout' : 'hold_or_rollback',
  rollbackPlan: recommendRollout
    ? 'Keep rollback package ready for 24h post-rollout observation.'
    : 'Rollback to baseline variant via NEXT_PUBLIC_HOME_EXPERIMENT_BASELINE_VARIANT and set canary percent to 0.'
};

console.log(JSON.stringify(decision, null, 2));
