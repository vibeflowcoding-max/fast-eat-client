import fs from 'node:fs';
import path from 'node:path';

const maxKb = Number(process.env.HOME_BUNDLE_MAX_KB || 600);
const reportPath = path.resolve(process.cwd(), '.next/analyze/client.json');

if (!fs.existsSync(reportPath)) {
  console.log('Bundle report not found; skipping budget check. Generate report before enforcing budget.');
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const totalBytes = Number(report.totalBytes || 0);
const totalKb = totalBytes / 1024;

if (totalKb > maxKb) {
  console.error(`Bundle budget exceeded: ${totalKb.toFixed(2)}KB > ${maxKb}KB`);
  process.exit(1);
}

console.log(`Bundle budget passed: ${totalKb.toFixed(2)}KB <= ${maxKb}KB`);
