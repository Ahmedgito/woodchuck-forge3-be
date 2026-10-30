# Report Generation Timeout Increases

## Overview

Increased timeout values across the Puppeteer-based PDF/PNG report generation pipeline to prevent premature failures for large datasets or extended date ranges.

---

## Files Changed

### `src/puppeteer/puppeteer-pool.ts`

| Setting | Before | After |
|---|---|---|
| `protocolTimeout` (Puppeteer browser protocol) | 120,000ms (2 min) | 300,000ms (5 min) |

---

### `src/puppeteer/puppeteer.service.ts`

| Setting | Before | After |
|---|---|---|
| `PLOTLY_LOAD_TIMEOUT` (wait for `.js-plotly-plot` selector) | 10,000ms (10s) | 30,000ms (30s) |
| `PAGE_NAVIGATION_TIMEOUT` | 60,000ms (1 min) | 120,000ms (2 min) |
| `PAGE_OPERATION_TIMEOUT` | 120,000ms (2 min) | 300,000ms (5 min) |
| `waitForFunction` — selector readiness check before PDF export | 30,000ms | 120,000ms (2 min) |
| `screenshotElements` — `waitForSelector` | 20,000ms | 60,000ms (1 min) |

---

### `src/home/home.service.ts`

| Setting / Location | Before | After |
|---|---|---|
| `setDefaultTimeout` — single-month PNG capture | 120,000ms | 300,000ms (5 min) |
| `setDefaultNavigationTimeout` — single-month PNG capture | 60,000ms | 120,000ms (2 min) |
| `waitForFunction` — single-month PNG: wait for `#report-root` + Plotly | 30,000ms | 120,000ms (2 min) |
| `setDefaultTimeout` — consolidated (multi-month) PNG capture | 120,000ms | 300,000ms (5 min) |
| `setDefaultNavigationTimeout` — consolidated (multi-month) PNG capture | 60,000ms | 120,000ms (2 min) |
| `waitForFunction` — multi-month: wait for `#report-root` + Plotly (per month) | 30,000ms | 120,000ms (2 min) |
| `waitForFunction` — single-month consolidated: wait for `#report-root` | 30,000ms | 120,000ms (2 min) |

---

## Root Cause

The primary cause of report generation failures was the `waitForFunction` timeout of **30 seconds**, which gates the entire page-render check before PDF export begins. For large datasets or extended date ranges, Plotly graphs and page elements can take significantly longer than 30 seconds to fully render, causing the job to throw `TimeoutError` and fail.

## Impact

- PDF, CSV, XLSX, and auto-export reports will no longer fail due to premature timeouts.
- Large or complex reports (multi-month consolidated, large job sites) will complete successfully.
- No logic or data changes — purely timeout value increases.
