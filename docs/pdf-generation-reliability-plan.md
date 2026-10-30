# PDF Generation — Reliability Fixes Plan

## Background

The previous mitigation (`TIMEOUT_CHANGES.md`) increased raw timeout values across the pipeline. That reduced immediate failures but did not address the **root causes**: the pipeline is slow because of sequential work that could be parallelised, a page loaded twice when once would do, a Puppeteer pool bottleneck, and no hard cap on a Bull job that stalls. This document covers seven structural fixes, how to implement each one, and how to test it.

---

## System Overview (as-is)

```
Cron (monthly/weekly) ──┐
                         ├─▶ QueuesService.generateReport()
Frontend (on-demand) ───┘        │  Bull job, no timeout set
                                 ▼
                   ReportGenerationConsumer
                   @Process('generate-report-job')
                         │
              ┌──────────┴──────────┐
              │                     │
   processJobSiteReport     processDashboardReport
              │                     │
   generateJobSiteReportData   generateDashboardReportData
   (sequential for-loop:        (Promise.all over months
    5 awaited DB calls/month)    — can overwhelm DB)
              │
   exportJobSiteReportToPdf ──▶ PuppeteerPool.usePage() [slot 1]
              │                   page.goto(networkidle0)
              │                   page.evaluate(fetch /inject)
              │                   waitForSelector('.js-plotly-plot', 30s)
              │                   waitForGraphSelectors() [5×30s serial]
              │                   waitForFunction(allSelectors, 120s)
              │                   page.pdf()
              │
   Collapse PNG capture ────▶ PuppeteerPool.usePage() [slot 2]
              │                   page.goto(SAME URL again, networkidle0)
              │                   page.evaluate(fetch /inject AGAIN)
              │                   waitForFunction(120s)
              │                   screenshotElements()
              │
           archiver ZIP ──▶ email / download response
```

**Pool cap:** `maxPages = 2`. Both slots are consumed per report. All queued cron reports process strictly serially.

---

## Fix 1 — Add a hard timeout to the Bull job

### Files
- `src/queues/queues.service.ts`

### Problem
`generateReport()` adds the job with `attempts: 3` and exponential backoff but no `timeout`. If Puppeteer hangs (Chrome crash, `networkidle0` never resolves, OOM), the job holds a worker slot indefinitely until `protocolTimeout: 300000` fires — then retries three times. One stuck report can occupy a slot for **15+ minutes**.

### Current code (line 74–88, `queues.service.ts`)
```typescript
await this.reportGenerationReq.add('generate-report-job', data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});
```

### Fix
```typescript
await this.reportGenerationReq.add('generate-report-job', data, {
  attempts: 3,
  timeout: 600000, // 10-minute hard cap per attempt
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
});
```

`timeout` in Bull causes the job to be marked failed (and trigger the retry) after the specified milliseconds, freeing the worker slot regardless of what Puppeteer is doing.

### Testing required
| Test | How |
|---|---|
| Normal report completes within 10 min | Trigger a single-month job-site and dashboard report end-to-end; confirm ZIP delivered |
| Stuck job is killed and retried | Temporarily set `timeout: 5000` and generate a real report; confirm Bull marks it failed and retries |
| After 3 failed retries, job goes to `failed` state | Confirm no worker slot is permanently blocked; queue drains |
| Cron batch still completes | Run a cron batch with multiple subscribers; confirm all complete (some later) |

---

## Fix 2 — Parallelise `waitForGraphSelectors`

### Files
- `src/puppeteer/puppeteer.service.ts`

### Problem
`waitForGraphSelectors()` iterates 5 CSS selectors in a `for` loop, each with a 30-second timeout. Selectors are independent. If a selector does not exist on a given report type (e.g., a user role that has no Sankey chart), all 5 time out sequentially = **150 seconds of dead waiting** added to every affected report.

### Current code (lines 374–389, `puppeteer.service.ts`)
```typescript
private async waitForGraphSelectors(page: puppeteer.Page): Promise<void> {
  for (const graphSelector of PuppeteerService.GRAPH_SELECTORS) {
    try {
      await page.waitForSelector(graphSelector, {
        timeout: PuppeteerService.PLOTLY_LOAD_TIMEOUT,
      });
    } catch (error) {
      console.warn(`[PDF Export] Graph selector ${graphSelector} not found, continuing...`);
    }
  }
}
```

### Fix
```typescript
private async waitForGraphSelectors(page: puppeteer.Page): Promise<void> {
  await Promise.all(
    PuppeteerService.GRAPH_SELECTORS.map((graphSelector) =>
      page
        .waitForSelector(graphSelector, {
          timeout: PuppeteerService.PLOTLY_LOAD_TIMEOUT,
        })
        .catch(() => {
          console.warn(
            `[PDF Export] Graph selector ${graphSelector} not found, continuing...`,
          );
        }),
    ),
  );
}
```

All 5 waits now run in parallel. The total wait is capped at the single longest selector, not the sum of all.

### Testing required
| Test | How |
|---|---|
| All selectors present (full report) | Generate a full dashboard report with Sankey + bar chart; confirm all selectors are found and PDF is correct |
| Some selectors absent (CC / manufacturer role) | Generate a report for a role that has no Sankey; confirm no extra 30-second delay per missing selector |
| Selector timeout still surfaces as error | Force-remove a required selector on the frontend; confirm error is thrown, not silently skipped |

---

## Fix 3 — Parallelise per-month DB queries in `generateJobSiteReportData`

### Files
- `src/job-sites/job-sites.service.ts`

### Problem
For each month in a range report, 5 independent DB queries are awaited one after the other inside a `for` loop. A 6-month report = **30 sequential DB calls** before Puppeteer is even started.

### Current code (lines 764–836, `job-sites.service.ts`)
```typescript
for (const plan of plans) {
  const jobSite = await this.jobSitesRepository.findOne({ id: dto.jobSiteId });
  const treeGraphStats = await this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(...);
  const treeGraphDiversionStats = await this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(...);
  const treeGraphWasteStreamsTypeStats = await this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(...);
  const treeGraphWoodWasteDiversionStats = await this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(...);
  const barGraph = await this.jobSitesWasteStreamsService.getBarGraph(...);
  reportDataArray.push(reportData);
}
```

Also note: `jobSitesRepository.findOne` is called **every iteration** for the same job site. This is redundant.

### Fix
```typescript
// Fetch job site once, outside the loop
const jobSite = await this.jobSitesRepository.findOne({ id: dto.jobSiteId });

for (const plan of plans) {
  const startForStats = weeklyOverrides?.startDate || plan.startDate;
  const endForStats   = weeklyOverrides?.endDate   || plan.endDate;

  // All 5 DB calls are independent — run in parallel
  const [
    treeGraphStats,
    treeGraphDiversionStats,
    treeGraphWasteStreamsTypeStats,
    treeGraphWoodWasteDiversionStats,
    barGraph,
  ] = await Promise.all([
    this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(startForStats, endForStats, dto.jobSiteId),
    this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(startForStats, endForStats, dto.jobSiteId),
    this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(startForStats, endForStats, dto.jobSiteId),
    this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(startForStats, endForStats, dto.jobSiteId),
    this.jobSitesWasteStreamsService.getBarGraph(startForStats, dto.jobSiteId, endForStats),
  ]);

  // ... rest of reportData assembly unchanged
  reportDataArray.push(reportData);
}
```

For a 6-month report this cuts the DB phase from ~30 sequential round-trips down to **6 parallel batches of 5** (effectively the cost of ~6 round-trips).

### Testing required
| Test | How |
|---|---|
| Single-month report unchanged | Generate a 1-month job-site report; verify data in PDF matches DB |
| Multi-month report data correct | Generate a 3-month range report; spot-check tree stats and bar graph for each month |
| DB connection pool not exhausted | Observe PostgreSQL `pg_stat_activity` during a 6-month report; confirm connections stay within pool limit |
| Error propagation | Force one query to throw; confirm the job fails correctly and does not produce a partial report |

---

## Fix 4 — Eliminate the second Puppeteer page load for collapse PNGs

### Files
- `src/home/home.service.ts`

### Problem
After the main PDF is generated, `exportDashboardReportToPdf` opens a **second Puppeteer page**, navigates to the same frontend URL, re-injects the same data, and waits for the same selectors — purely to screenshot the `.ant-collapse-item.ant-collapse-item-active` elements. This doubles the page load overhead and consumes the second pool slot simultaneously (or blocks behind the first if both slots are taken).

The page used for PDF generation is fully rendered at this point. The collapse PNGs can be captured on that same page before it is closed.

### Current flow
```
PuppeteerPool.usePage(page1)        ← slot 1
  page.goto + inject + waitFor
  page.pdf()                        ← PDF done, page still open
  // page1 closes here

PuppeteerPool.usePage(page2)        ← slot 2 (or queued)
  page.goto AGAIN
  inject AGAIN
  waitFor AGAIN
  screenshotElements()
  page2 closes
```

### Fix
Move the collapse screenshot into the same `usePage` callback, after `exportPdfWithCommonParams` returns, before the page is closed. The `exportReportPageToPdf` method signature needs to accept an optional post-PDF callback that receives the live page.

**Option A — Post-PDF callback (minimal API change):**

```typescript
// puppeteer.service.ts — add optional callback param
async exportReportPageToPdf({
  ...,
  afterPdf?: (page: puppeteer.Page) => Promise<void>,
}: { ..., afterPdf?: (page: puppeteer.Page) => Promise<void> }) {
  await PuppeteerPool.usePage(async (page) => {
    // ... existing navigation, injection, waitFor, pdf() ...
    await this.exportPdfWithCommonParams(page, pdfPath, exportSelector, { fullPagePdf });

    if (afterPdf) {
      await afterPdf(page);
    }
  });
}
```

```typescript
// home.service.ts — pass afterPdf to capture collapse PNGs in the same session
let collapsePngPaths: string[] = [];

await this.puppeteerService.exportReportPageToPdf({
  url, data, injectEndpoint, waitForSelectors, pdfPath, fullPagePdf,
  afterPdf: async (page) => {
    if (hasMonthsData) {
      collapsePngPaths = await this.puppeteerService.screenshotElements(
        page,
        '.ant-collapse-item.ant-collapse-item-active',
        process.cwd(),
        'collapse-item',
      );
    }
  },
});
```

This eliminates the second `page.goto`, second data injection, and second `waitForFunction` — saving 30–120 seconds per report month.

### Testing required
| Test | How |
|---|---|
| Collapse PNGs still generated correctly | Generate a dashboard report with active collapse panels; verify PNGs in ZIP are valid |
| PDF not affected by collapse screenshot | Confirm PDF content is unchanged before/after the callback runs |
| No collapse items still works | Generate a report with no active collapse panels (`hasMonthsData = false`); confirm empty `collapsePngPaths` and no error |
| Multi-month range report | Generate a 3-month range report; confirm collapse PNGs per month are correct |
| Pool slot freed correctly | Confirm `PuppeteerPool.activePages` returns to 0 after job completes (no slot leak) |

---

## Fix 5 — Replace `networkidle0` with `domcontentloaded` + selector-based readiness

### Files
- `src/puppeteer/puppeteer.service.ts`
- `src/home/home.service.ts`

### Problem
All `page.goto` calls use `waitUntil: 'networkidle0'`, which blocks until there are zero in-flight network requests for 500 ms. In practice:
- Next.js pages make background font, lazy-image, and analytics fetches that never fully quiet down.
- When report data is large (many months, many waste streams), the frontend may issue additional fetches after initial load, causing `networkidle0` to reset and keep waiting.
- Any failed or slow external resource (CDN font, analytics beacon) extends the wait indefinitely.

The actual readiness signal is already captured by `waitForFunction` (watching `#report-root` and `#sankey-container--r0-`). The `networkidle0` wait is redundant.

### Fix
```typescript
// In puppeteer.service.ts — exportReportPageToPdf
await page.goto(url, { waitUntil: 'domcontentloaded' });

// In home.service.ts — collapse PNG page
await page.goto(frontendDomain + '/export/dashboard', { waitUntil: 'domcontentloaded' });
```

The `waitForFunction` call that follows already polls until the page content is ready. Switching to `domcontentloaded` means Puppeteer waits only for the HTML to parse, then immediately hands control to the selector-based checks. This also avoids the edge case where a third-party script keeps an XHR open indefinitely.

### Testing required
| Test | How |
|---|---|
| Page renders fully before PDF | Generate 5 reports across different report types; confirm charts and data are present in the PDF |
| No `networkidle0` regression | Compare PDF output before and after the change for the same dataset |
| Slow/failed external resource | Block a CDN request (via DevTools or Charles proxy in QA env); confirm report still completes |
| `waitForFunction` correctly gates rendering | Introduce an artificial 3-second data load delay on the frontend; confirm `waitForFunction` still holds until ready |

---

## Fix 6 — Fix the commented-out browser cache in `puppeteer.service.ts`

### Files
- `src/puppeteer/puppeteer.service.ts`

### Problem
The `getBrowser()` method has its reuse guard commented out, so it launches a fresh Chromium process on every call:

```typescript
// if (!this.browser) {   ← COMMENTED OUT
this.browser = await puppeteer.launch({ ... });
// }
```

Any code that calls `this.getBrowser()` or `this.newPage()` directly (outside of `PuppeteerPool`) spawns a new browser instance. This is a memory leak and adds ~1–2 seconds of Chromium startup overhead per call.

### Fix
```typescript
async getBrowser(): Promise<puppeteer.Browser> {
  if (!this.browser || !this.browser.connected) {
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return this.browser;
}
```

Adding `!this.browser.connected` guards against the case where the cached browser has crashed and needs to be relaunched.

> **Note:** If `getBrowser()` / `newPage()` is not called anywhere outside of `PuppeteerPool.usePage()`, this fix prevents future accidental misuse. Confirm usages with a codebase search before merging.

### Testing required
| Test | How |
|---|---|
| Browser reused across calls | Add a `console.log('launching browser')` temporarily; confirm it fires only once per server restart, not per report |
| Crashed browser is recovered | Kill the Chromium PID mid-report (or simulate with `browser.disconnect()`); confirm next report spawns a new browser |
| No stale page from previous session | Generate two consecutive reports; confirm data does not bleed between pages |

---

## Fix 7 — Increase `PuppeteerPool.maxPages` and document the scaling rationale

### Files
- `src/puppeteer/puppeteer-pool.ts`

### Problem
`maxPages = 2` means at most 2 Puppeteer pages are active at once across the entire process. With Fix 4 in place (single page per report), each report uses exactly 1 slot. But with the current double-page design, a single report uses both slots, making all reports strictly sequential.

Even after Fix 4, `maxPages = 2` means only 2 reports can generate PDFs simultaneously. For a cron batch with 50 subscribers, this means reports process in a queue. Each report taking 3 minutes × 50 / 2 = **75 minutes** for the entire batch to complete.

### Fix
Raise `maxPages` based on the available Docker container memory. Chromium uses approximately **150–300 MB per page** at the viewport sizes configured (`1500×1080`, `deviceScaleFactor: 2`).

| Container RAM | Safe `maxPages` |
|---|---|
| 2 GB | 4 |
| 4 GB | 8 |
| 8 GB | 12–16 |

```typescript
// puppeteer-pool.ts
private static maxPages = 4; // Increase from 2 — adjust based on container RAM
```

Additionally, make this configurable via an environment variable so it can be tuned per environment without a code deploy:

```typescript
private static maxPages = parseInt(process.env.PUPPETEER_MAX_PAGES || '4', 10);
```

### Testing required
| Test | How |
|---|---|
| Concurrent reports complete correctly | Trigger 5 simultaneous report jobs; confirm all produce correct ZIPs with no data mixing between reports |
| Memory stays within limits | Monitor `docker stats` during a batch of 10 concurrent reports; confirm container does not OOM-kill |
| Queue drains under load | Run a simulated cron batch (20 jobs); measure total wall-clock time vs. baseline |
| Pool releases slots correctly | After a report errors, confirm `activePages` decrements (slot not leaked) |

---

## Summary Table

| # | Fix | Files |
|---|-----|-------|
| 1 | Bull job hard timeout | `queues.service.ts` |
| 2 | Parallel `waitForGraphSelectors` | `puppeteer.service.ts` |
| 3 | Parallel per-month DB queries | `job-sites.service.ts` |
| 4 | Eliminate second Puppeteer page load | `puppeteer.service.ts`, `home.service.ts` |
| 5 | Replace `networkidle0` with `domcontentloaded` | `puppeteer.service.ts`, `home.service.ts` |
| 6 | Fix browser cache guard | `puppeteer.service.ts` |
| 7 | Raise `maxPages` + env var | `puppeteer-pool.ts` |

---

## Recommended Rollout Order

Fixes are ordered by risk vs. impact. Lower-numbered fixes are safer and can be deployed independently.

1. **Fix 1** (Bull timeout) — purely additive config; zero risk; stops zombie jobs immediately.
2. **Fix 6** (browser cache) — one-line uncomment; fixes a silent bug; very low risk.
3. **Fix 5** (`networkidle0` → `domcontentloaded`) — small change, large reliability gain; test thoroughly across report types.
4. **Fix 2** (parallel selector waits) — internal refactor; no output change; easy to verify.
5. **Fix 3** (parallel DB queries) — data correctness must be verified before deploy.
6. **Fix 7** (raise `maxPages`) — increase gradually; monitor memory in staging first.
7. **Fix 4** (single page for PDF + PNGs) — largest change; requires most testing; deploy last.

---

## Out of Scope (Future Considerations)

- **Splitting the Bull worker into a dedicated microservice / separate process**: would allow horizontal scaling of PDF workers independent of the API process.
- **Pre-rendering report data to a static JSON store** before Puppeteer loads the page: removes the data injection round-trip entirely and makes the frontend render deterministic.
- **Replacing Puppeteer with a server-side PDF library** (e.g., `@react-pdf/renderer`, `pdfmake`): eliminates headless browser entirely; significant frontend/design effort but removes the entire class of browser-related flakiness.
