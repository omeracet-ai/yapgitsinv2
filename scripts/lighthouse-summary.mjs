#!/usr/bin/env node
// Parse Lighthouse JSON outputs and print score summary table.
// Usage: node scripts/lighthouse-summary.mjs

import fs from 'fs';
import path from 'path';

const dir = 'reports/lighthouse';
if (!fs.existsSync(dir)) {
  console.error(`No reports directory: ${dir}`);
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
if (files.length === 0) {
  console.error('No JSON reports found.');
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('Page', 50)} | ${pad('Perf', 5)} | ${pad('A11y', 5)} | ${pad('SEO', 5)} | ${pad('BestPr', 6)}`);
console.log('-'.repeat(85));

let fails = 0;
const thresholds = { performance: 80, accessibility: 90, seo: 95, 'best-practices': 90 };

for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const c = data.categories || {};
    const score = (k) => c[k] && c[k].score != null ? Math.round(c[k].score * 100) : 0;
    const p = score('performance');
    const a = score('accessibility');
    const s = score('seo');
    const b = score('best-practices');
    for (const [k, t] of Object.entries(thresholds)) {
      if (score(k) < t) fails++;
    }
    console.log(`${pad(f.slice(0, 50), 50)} | ${pad(p, 5)} | ${pad(a, 5)} | ${pad(s, 5)} | ${pad(b, 6)}`);
  } catch (e) {
    console.log(`${pad(f.slice(0, 50), 50)} | PARSE_ERROR: ${e.message}`);
    fails++;
  }
}

console.log('-'.repeat(85));
console.log(`Thresholds: Perf 80+ | A11y 90+ | SEO 95+ | BestPr 90+`);
console.log(`Threshold misses: ${fails}`);
