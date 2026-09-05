/**
 * Fails CI when production JS chunks exceed budgets.
 * Run after `vite build` (expects `dist/`).
 *
 * Budgets are intentionally generous for an MUI SPA; tighten as the app sheds weight.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

/** Soft ceilings in kilobytes (1024). */
const BUDGETS = {
  /** Sum of all emitted .js assets under dist/ */
  totalJsKb: 3200,
  /** Largest single JS chunk */
  maxChunkKb: 1200,
};

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsFiles(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walkJsFiles(distDir);
if (files.length === 0) {
  console.error(`No JS assets found in ${distDir}. Run "npm run build" first.`);
  process.exit(1);
}

const sizes = files.map((file) => ({
  file: path.relative(distDir, file).replace(/\\/g, '/'),
  kb: Math.round((fs.statSync(file).size / 1024) * 10) / 10,
}));

sizes.sort((a, b) => b.kb - a.kb);
const totalKb = Math.round(sizes.reduce((sum, row) => sum + row.kb, 0) * 10) / 10;
const largest = sizes[0];

console.log('--- Bundle budget ---');
console.log(`Total JS: ${totalKb} KB (budget ${BUDGETS.totalJsKb} KB)`);
console.log(`Largest chunk: ${largest.file} — ${largest.kb} KB (budget ${BUDGETS.maxChunkKb} KB)`);
console.log('Top 8 JS assets:');
for (const row of sizes.slice(0, 8)) {
  console.log(`  ${row.kb.toString().padStart(8)} KB  ${row.file}`);
}

let failed = false;
if (totalKb > BUDGETS.totalJsKb) {
  console.error(`FAIL: total JS ${totalKb} KB exceeds ${BUDGETS.totalJsKb} KB`);
  failed = true;
}
if (largest.kb > BUDGETS.maxChunkKb) {
  console.error(
    `FAIL: largest chunk ${largest.file} (${largest.kb} KB) exceeds ${BUDGETS.maxChunkKb} KB`,
  );
  failed = true;
}

if (failed) process.exit(1);
console.log('Bundle budget OK');
