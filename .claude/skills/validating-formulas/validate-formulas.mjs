#!/usr/bin/env node
/**
 * WoodChuck formula validator.
 *
 * Checks that every calculation formula documented in the Calculation
 * Reference still matches the backend code, using formulas.json as the
 * executable spec:
 *   - regex anchors: the implementing code (constants, filters, expressions)
 *     must still be present in the named files
 *   - numeric examples: the documented formula must still produce the
 *     documented result
 *
 * Usage (from anywhere inside wc-backend):
 *   node .claude/skills/validating-formulas/validate-formulas.mjs [--json]
 *
 * Exit code 0 = all formulas verified, 1 = drift detected, 2 = harness error.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(skillDir, '../../..'); // wc-backend
const asJson = process.argv.includes('--json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(skillDir, 'formulas.json'), 'utf8'));
} catch (e) {
  console.error(`Cannot read formulas.json: ${e.message}`);
  process.exit(2);
}

const fileCache = new Map();
function readSource(rel) {
  if (!fileCache.has(rel)) {
    fileCache.set(rel, readFileSync(join(repoRoot, rel), 'utf8'));
  }
  return fileCache.get(rel);
}

const results = [];
for (const formula of manifest.formulas) {
  const failures = [];

  for (const check of formula.checks ?? []) {
    let count = 0;
    try {
      const src = readSource(check.file);
      const re = new RegExp(check.pattern, 'g');
      while (re.exec(src) !== null) count++;
    } catch (e) {
      failures.push(`${check.file}: ${e.code === 'ENOENT' ? 'file not found' : e.message}`);
      continue;
    }
    const min = check.minCount ?? 1;
    if (count < min) {
      failures.push(
        `${check.file}: expected >=${min} match(es) of /${check.pattern}/, found ${count}`,
      );
    }
  }

  for (const ex of formula.examples ?? []) {
    let actual;
    try {
      actual = Function(`"use strict"; return (${ex.expr});`)();
    } catch (e) {
      failures.push(`example "${ex.note}": expression error — ${e.message}`);
      continue;
    }
    if (typeof actual !== 'number' || Math.abs(actual - ex.expected) > 1e-9) {
      failures.push(`example "${ex.note}": ${ex.expr} = ${actual}, expected ${ex.expected}`);
    }
  }

  results.push({ id: formula.id, name: formula.name, spec: formula.spec, failures });
}

const failed = results.filter((r) => r.failures.length > 0);

if (asJson) {
  console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
} else {
  for (const r of results) {
    const mark = r.failures.length === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`${mark}  ${r.name}  [${r.id}]`);
    for (const f of r.failures) console.log(`        ${f}`);
  }
  console.log('');
  console.log(
    failed.length === 0
      ? `All ${results.length} formulas verified against the code.`
      : `${failed.length} of ${results.length} formulas FAILED — the code no longer matches the documented spec (or the spec is stale).`,
  );
}
process.exit(failed.length === 0 ? 0 : 1);
