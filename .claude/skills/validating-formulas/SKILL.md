---
name: validating-formulas
description: Use when changing or reviewing wc-backend calculation code (job-site stats, dashboard stats, diversion percentages, CO2e, transport CO2, clean energy, dumpster weights), before merging a PR that touches those metrics, or when asked whether the formulas still match the documented spec.
---

# Validating Formulas

## Overview

`formulas.json` is the executable spec of every WoodChuck calculation: regex anchors that must exist in the code, plus numeric examples the formulas must reproduce. `validate-formulas.mjs` checks all of it deterministically. The human-readable companion is the **"WoodChuck Calculation Reference"** artifact (ask the team for the link; a PDF copy circulates too).

## Quick start

```bash
node .claude/skills/validating-formulas/validate-formulas.mjs
```

Exit 0 = every formula verified. Exit 1 = drift. Add `--json` for machine-readable output.

## When a formula FAILs

A FAIL means code and spec disagree. Decide which one is right:

1. **Read the failing file/pattern** printed under the FAIL line and inspect the code it anchors.
2. **Unintentional change** (bug, refactor side-effect): fix the code, re-run until green.
3. **Intentional change** (new factor, new model): update the matching entry in `formulas.json` **and** the Calculation Reference doc in the same PR, then re-run until green.

**Never edit `formulas.json` just to silence a FAIL.** The manifest is the spec; changing it without updating the reference doc (and, for business constants like the CO2e factor, without a confirmed business decision) hides drift instead of catching it.

## When you change calculation code

Add or update the manifest entry in the same PR:

```json
{
  "id": "kebab-case-id",
  "name": "Human name",
  "spec": "one-line formula in plain math",
  "checks": [{ "file": "src/...", "pattern": "escaped regex", "minCount": 1 }],
  "examples": [{ "note": "sample", "expr": "10 * 1.65", "expected": 16.5 }]
}
```

Anchor patterns to the **specific expression** (constants, params arrays, method-scoped windows like `async totalDiverted\\(\\)[\\s\\S]{0,900}?...`), then prove the check works: mutate the constant/filter temporarily, confirm the validator FAILs, revert (`git checkout -- <file>`), confirm green.

## Common mistakes

| Mistake | Fix |
|---|---|
| Loose window regex satisfied by commented-out legacy code | Anchor to the exact live expression (e.g. the `excludedTypes: [...]` array, not nearby keywords) |
| Adding a check without mutation-testing it | A check that can't fail validates nothing — break the code on purpose once, watch it FAIL, revert |
| Updating manifest but not the Calculation Reference doc | Doc, manifest, and code move together in one PR |
| Treating a green run as proof the math is *right* | Green means code matches the *documented* spec; disputed constants (CO2e 1.65 vs 1.05) are tracked in the reference doc's discrepancy list |
