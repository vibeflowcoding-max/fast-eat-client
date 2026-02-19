import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/analyze-home-experiment.mjs <events.json|events.ndjson>');
  process.exit(1);
}

function parseEvents(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON input must be an array of events.');
    }
    return parsed;
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function erfApprox(x) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const poly = (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t);
  const y = 1 - poly * Math.exp(-absX * absX);

  return sign * y;
}

function normalCdf(x) {
  return 0.5 * (1 + erfApprox(x / Math.sqrt(2)));
}

function twoProportionZTest(successA, totalA, successB, totalB) {
  if (!totalA || !totalB) {
    return { zScore: 0, pValue: 1 };
  }

  const pA = successA / totalA;
  const pB = successB / totalB;
  const pooled = (successA + successB) / (totalA + totalB);
  const stdError = Math.sqrt(pooled * (1 - pooled) * ((1 / totalA) + (1 / totalB)));

  if (stdError === 0) {
    return { zScore: 0, pValue: 1 };
  }

  const zScore = (pB - pA) / stdError;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

  return { zScore, pValue };
}

function metricRow(variantId, metrics) {
  const views = metrics.home_view;

  return {
    variant_id: variantId,
    home_views: views,
    rail_item_clicks: metrics.rail_item_click,
    add_to_cart_from_home: metrics.add_to_cart_from_home,
    checkout_start: metrics.checkout_start,
    checkout_complete: metrics.checkout_complete,
    ctr_home_to_restaurant: rate(metrics.rail_item_click, views),
    add_to_cart_rate: rate(metrics.add_to_cart_from_home, views),
    checkout_start_rate: rate(metrics.checkout_start, views),
    checkout_completion_rate: rate(metrics.checkout_complete, views)
  };
}

const resolvedPath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Input file not found: ${resolvedPath}`);
  process.exit(1);
}

const content = fs.readFileSync(resolvedPath, 'utf-8');
const events = parseEvents(content).filter((event) => event && typeof event === 'object');

const experimentEvents = events.filter((event) =>
  typeof event.experiment_id === 'string' &&
  typeof event.variant_id === 'string' &&
  typeof event.name === 'string'
);

if (experimentEvents.length === 0) {
  console.error('No experiment events found with experiment_id, variant_id, and name.');
  process.exit(1);
}

const experimentId = String(experimentEvents[0].experiment_id);
const filteredEvents = experimentEvents.filter((event) => String(event.experiment_id) === experimentId);

const countersByVariant = new Map();

for (const event of filteredEvents) {
  const variantId = String(event.variant_id);
  if (!countersByVariant.has(variantId)) {
    countersByVariant.set(variantId, {
      home_view: 0,
      rail_item_click: 0,
      add_to_cart_from_home: 0,
      checkout_start: 0,
      checkout_complete: 0
    });
  }

  const counters = countersByVariant.get(variantId);
  if (Object.hasOwn(counters, event.name)) {
    counters[event.name] += 1;
  }
}

const rows = [...countersByVariant.entries()]
  .map(([variantId, metrics]) => metricRow(variantId, metrics))
  .sort((a, b) => a.variant_id.localeCompare(b.variant_id));

let significance = null;
if (rows.length >= 2) {
  const [variantA, variantB] = rows;

  const addToCartTest = twoProportionZTest(
    variantA.add_to_cart_from_home,
    variantA.home_views,
    variantB.add_to_cart_from_home,
    variantB.home_views
  );

  const checkoutCompleteTest = twoProportionZTest(
    variantA.checkout_complete,
    variantA.home_views,
    variantB.checkout_complete,
    variantB.home_views
  );

  significance = {
    compared_variants: [variantA.variant_id, variantB.variant_id],
    add_to_cart_rate: {
      variant_a: variantA.add_to_cart_rate,
      variant_b: variantB.add_to_cart_rate,
      delta: variantB.add_to_cart_rate - variantA.add_to_cart_rate,
      z_score: addToCartTest.zScore,
      p_value: addToCartTest.pValue
    },
    checkout_completion_rate: {
      variant_a: variantA.checkout_completion_rate,
      variant_b: variantB.checkout_completion_rate,
      delta: variantB.checkout_completion_rate - variantA.checkout_completion_rate,
      z_score: checkoutCompleteTest.zScore,
      p_value: checkoutCompleteTest.pValue
    }
  };
}

const output = {
  generatedAt: new Date().toISOString(),
  experiment_id: experimentId,
  variants: rows,
  significance
};

console.log(JSON.stringify(output, null, 2));
