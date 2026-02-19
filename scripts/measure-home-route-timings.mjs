import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.HOME_PERF_BASE_URL || 'http://localhost:3000';
const samples = Number(process.env.HOME_PERF_SAMPLES || 15);
const outputPath = path.resolve(process.cwd(), 'docs/home-performance-report.json');

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const railRenderDurations = [];
const assistantOpenDurations = [];

const browser = await chromium.launch({ headless: true });

for (let i = 0; i < samples; i += 1) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    const payload = {
      state: {
        fromNumber: '',
        customerName: '',
        activeOrders: {},
        items: [],
        expirationTime: null,
        branchId: '',
        userLocation: null,
        isOnboarded: true
      },
      version: 0
    };

    window.localStorage.setItem('fasteat-storage', JSON.stringify(payload));
  });

  const navStart = Date.now();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('section[aria-labelledby], main', { timeout: 15000 });
  railRenderDurations.push(Date.now() - navStart);

  const assistantButton = page.getByRole('button', { name: /Abrir asistente de descubrimiento|Asistente/i });
  if (await assistantButton.count()) {
    try {
      const openStart = Date.now();
      await assistantButton.first().click({ force: true });
      await page.getByRole('dialog', { name: /Asistente de descubrimiento/i }).waitFor({ timeout: 5000 });
      assistantOpenDurations.push(Date.now() - openStart);
    } catch {
      // Keep report generation resilient even when assistant launcher is not interactable in a sample.
    }
  }

  await context.close();
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  samples,
  railRender: {
    medianMs: Number(median(railRenderDurations).toFixed(2)),
    p95Ms: Number(percentile(railRenderDurations, 95).toFixed(2)),
    valuesMs: railRenderDurations
  },
  assistantOpen: {
    medianMs: Number(median(assistantOpenDurations).toFixed(2)),
    p95Ms: Number(percentile(assistantOpenDurations, 95).toFixed(2)),
    valuesMs: assistantOpenDurations
  }
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`Home performance report written to ${outputPath}`);
console.log(JSON.stringify(report, null, 2));
