import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.HOME_QA_BASE_URL || 'http://localhost:3000';
const outputPath = path.resolve(process.cwd(), 'docs/home-responsive-qa-report.json');

const viewports = [
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x900', width: 1440, height: 900 }
];

const screenshotsDir = path.resolve(process.cwd(), 'docs/qa-screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();

  const result = {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    passed: false,
    horizontalOverflow: null,
    screenshot: null,
    error: null
  };

  try {
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

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('main', { timeout: 10000 });

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });

    const screenshotFile = path.join(screenshotsDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshotFile, fullPage: true });

    result.horizontalOverflow = horizontalOverflow;
    result.screenshot = screenshotFile;
    result.passed = !horizontalOverflow;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  results.push(result);
  await context.close();
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length
  },
  results
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`Responsive QA report written to ${outputPath}`);
console.log(JSON.stringify(report, null, 2));
