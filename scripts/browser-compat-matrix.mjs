#!/usr/bin/env node
/**
 * Merges the per-browser JSON written by src/__tests__/e2e/browser-compat.spec.ts
 * into a single support matrix.
 *
 * Usage: node scripts/browser-compat-matrix.mjs [--markdown]
 * (--markdown emits a GitHub-flavoured table, for job summaries.)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'test-results', 'browser-compat');
const asMarkdown = process.argv.includes('--markdown');

let files;
try {
  files = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
} catch {
  console.log('No capability results found — run the browser-compat spec first.');
  process.exit(0);
}

if (files.length === 0) {
  console.log('No capability results found — run the browser-compat spec first.');
  process.exit(0);
}

const reports = await Promise.all(
  files.map(async (f) => JSON.parse(await readFile(path.join(DIR, f), 'utf8'))),
);

const browsers = reports.map((r) => r.project);
const probes = reports[0].probes.map((p) => p.id);
const meta = Object.fromEntries(reports[0].probes.map((p) => [p.id, p]));

const supportOf = (browser, probeId) =>
  reports.find((r) => r.project === browser)?.probes.find((p) => p.id === probeId)?.supported;

const mark = (v) => (v === undefined ? '–' : v ? (asMarkdown ? '✅' : 'ok') : asMarkdown ? '❌' : 'MISS');

const rows = probes.map((id) => ({
  id,
  feature: meta[id].feature,
  required: meta[id].required,
  cells: browsers.map((b) => supportOf(b, id)),
}));

const inconsistent = rows.filter((r) => new Set(r.cells.filter((c) => c !== undefined)).size > 1);

if (asMarkdown) {
  console.log(`### Browser capability matrix\n`);
  console.log(`| Capability | Feature it powers | Req | ${browsers.join(' | ')} |`);
  console.log(`|---|---|---|${browsers.map(() => '---').join('|')}|`);
  for (const r of rows) {
    console.log(
      `| \`${r.id}\` | ${r.feature} | ${r.required ? 'yes' : 'no'} | ${r.cells.map(mark).join(' | ')} |`,
    );
  }
  console.log('');
  if (inconsistent.length) {
    console.log(`### ⚠️ Inconsistent across browsers\n`);
    for (const r of inconsistent) {
      const missing = browsers.filter((_, i) => r.cells[i] === false);
      console.log(`- \`${r.id}\` — ${r.feature}. Unsupported in: **${missing.join(', ')}**`);
    }
  } else {
    console.log(`All probed capabilities behave consistently across ${browsers.join(', ')}.`);
  }
} else {
  const width = Math.max(...probes.map((p) => p.length)) + 2;
  console.log('Browser capability matrix');
  console.log('─'.repeat(width + browsers.length * 10));
  console.log('capability'.padEnd(width) + browsers.map((b) => b.padEnd(10)).join(''));
  for (const r of rows) {
    console.log(r.id.padEnd(width) + r.cells.map((c) => mark(c).padEnd(10)).join(''));
  }
  console.log('');
  if (inconsistent.length) {
    console.log('⚠️  Inconsistent across browsers:');
    for (const r of inconsistent) {
      const missing = browsers.filter((_, i) => r.cells[i] === false);
      console.log(`   - ${r.id} (${r.feature}) — unsupported in: ${missing.join(', ')}`);
    }
  } else {
    console.log(`✅ All probed capabilities consistent across ${browsers.join(', ')}.`);
  }
}
