# Weekly Client-Format Excel Report (WD-1719)

## Overview

Clients flagged in `client_report_config` currently receive a purpose-built Excel
workbook with their **monthly** report — see
[Cumulative Monthly Excel Report](./cumulative-monthly-excel-report.md). Their
**weekly** report still receives the standard Excel export.

This change gives those clients the same workbook structure in their weekly
report, scoped to a single Monday–Sunday period. The weekly workbook is **not**
cumulative: it contains only that week's data, and neither its filename nor the
email wording uses the word "Cumulative".

Walbridge is the only client with `enabled = true` today, so it is the only
client affected. Any client enabled later gets both formats with no code change.

## Scope

**In scope**

- Weekly Excel for clients with `client_report_config.enabled = true`, for both
  job-site and dashboard weekly subscriptions.
- Reporting period: previous Monday 00:00:00 → previous Sunday 23:59:59, as
  already produced by `getLastWeekDateRange()`.

**Out of scope — unchanged**

- The weekly cron schedule (`EVERY_MONDAY_AT_08_00`). No scheduling changes.
- Weekly PDF and CSV reports.
- The monthly cumulative Excel report, in behaviour, filename, or wording.
- Clients without `client_report_config.enabled`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Replace or supplement the standard weekly Excel? | **Replace** | Mirrors monthly, where the client-format branch `continue`s past `processExcelCsvFormat`. Enabled clients get one `.xlsx` link, not two. |
| Row granularity | **One row per waste stream for the whole week** | Same grain as monthly (one row per stream per period), with a 7-day bucket instead of a calendar month. |
| Gating | **Reuse the existing `enabled` boolean** | No migration. One switch turns on both formats for any future client, satisfying the "enable for other customers without significant code changes" criterion. |
| Code structure | **Generalise the existing service to be period-driven** | One workbook writer shared by monthly and weekly, so column/format parity holds by construction rather than by review. |

## Architecture

### `ClientExcelReportService`

`src/report-export/cumulative-excel.service.ts` is renamed to
`src/report-export/client-excel-report.service.ts`, and `CumulativeExcelService`
to `ClientExcelReportService` — "cumulative" is no longer accurate for half of
its behaviour. The rename is mechanical and touches the consumer, the cron job,
and `report-export.module.ts`.

Two public entry points over one shared core:

```ts
// Unchanged signature and output.
generateCumulativeExcel(
  clientId: number,
  previousMonthEnd: Date,
  outputPath: string,
  jobSiteId?: number,
): Promise<{ filename: string; path: string }>

// New.
generateWeeklyExcel(
  clientId: number,
  weekStart: Date,
  weekEnd: Date,
  outputPath: string,
  jobSiteId?: number,
): Promise<{ filename: string; path: string }>
```

Both resolve to `buildPeriodData(clientId, periods, jobSiteId?)` →
`generateExcelWithTabs(...)`. The only difference is how `periods` is derived:

- **Monthly** — as today: `eachMonthOfInterval` from
  `startOfMonth(site.startDate ?? site.createdAt)` through `reportEndDate`, one
  bucket per calendar month, per job site.
- **Weekly** — a single bucket `{ start: weekStart, end: weekEnd }`, identical
  for every job-site tab. The site's own start date is **not** used as the lower
  bound, so no history outside the week can leak in.

`generateExcelWithTabs` gains one extra argument — a `WorkbookNaming`
descriptor (`{ prefix: 'cumulative_report' | 'weekly_report', dateSegment,
creator }`) — so the shared writer produces the right filename and document
metadata without knowing which frequency it is serving. Nothing else about the
writer is parameterised.

Everything else is reused untouched: the dumpster query and its
`Between(new Date(start), new Date(end + ' 23:59:59'))` bounds,
`normalizeWasteStreamName`, the `real_weight ?? estimated_weight ?? 0` tonnage
fallback, the `WasteStreamActivityMappingService` lookup, `sanitizeSheetName`,
and the `quantity > 0` row filter.

### Workbook structure (identical for both formats)

One tab per job site, tab name = sanitised job-site title (31 chars max).
Header row bold on `FFBFBFBF` fill, all columns width 15:

`Description | Start Date | End Date | Quantity | Unit | Supplier | Activity`

A weekly row: `WOOD WASTE | 2026-08-17 | 2026-08-23 | 4.2 | Tonnage | Woodchuck | Biomass`

Rows with `quantity <= 0` are omitted. A job site with no activity that week
still gets its tab, containing the header row only — the same outcome as a
monthly tab whose months were all empty.

Tab scope mirrors monthly: a **job-site** report yields one tab (that site); a
**dashboard** report yields a tab per job site of the client.

### Consumer wiring

Two call sites in `src/queues/consumers/ReportGeneration.consumer.ts` currently
read `if (format === EXCEL && !isWeekly)`. The `!isWeekly` guard is dropped and
the frequency choice moves into one helper:

- job-site: `processJobSiteFormats` (~line 926)
- dashboard: `processDashboardFormats` (~line 1739)

```ts
if (format === ReportFormatEnum.EXCEL) {
  const clientId = /* unchanged resolution per site / dashboard */;
  if (clientId && (await this.clientReportConfigService.isEnabled(clientId))) {
    await this.processClientFormatExcel(clientId, attachmentsMap, jobData, siteId);
    continue; // replaces the standard xlsx, as monthly does today
  }
}
```

`jobSiteId` is the site id for job-site reports and `undefined` for dashboard
reports, exactly as `processCumulativeExcelFormat` receives it today.

`processClientFormatExcel` replaces `processCumulativeExcelFormat` and branches
once:

- **Weekly** — when `jobData.weeklyOverrides?.weekly` is true *and* both
  `startDate` and `endDate` are present → `generateWeeklyExcel(...)`, bucketed
  under attachment key `` `${startDate}_${endDate}-client-weekly` ``.
- **Otherwise** — `generateCumulativeExcel(clientId, endOfMonth(subMonths(now, 1)), cwd, jobSiteId)`,
  key `` `${format(now, 'yyyy-MM-dd')}-cumulative` `` — the current path,
  unchanged.

If `weekly` is set but either date is missing, fall back to the cumulative
branch rather than inventing a range.

Existing report-logger calls are kept, with `isCumulative` reflecting the branch
actually taken so the log line distinguishes the two.

## Naming and email wording

"Cumulative" reaches the user through exactly two channels, both derived from
the attachment-map key. `buildFileLinkLabel` inserts the word only when the key
matches `/-cumulative$/i`, and `mail.service.ts#getDownloadLinksText` is already
guarded by `!weekly`. Choosing a weekly key that does not match that pattern
removes the word everywhere — **no change is needed in either file**.

| Surface | Monthly (unchanged) | Weekly (new) |
|---|---|---|
| Filename | `cumulative_report_Walbridge_2026-08-24.xlsx` | `weekly_report_Walbridge_2026-08-17_2026-08-23.xlsx` |
| Job-site filename suffix | `_jobsite_<id>` before the date | `_jobsite_<id>` before the dates |
| Attachment key | `2026-08-24-cumulative` | `2026-08-17_2026-08-23-client-weekly` |
| Download-link label | `08-01-2026 Cumulative Excel Report` | `2026-08-17-2026-08-23 Excel Report` |
| Email body text | `common.downloadCumulativeReportsText` | `common.downloadReportsText` |
| Workbook `creator` | `Woodchuck Cumulative Report` | `Woodchuck Weekly Report` |

The weekly link label falls out of existing code: `reportDateLabel()` already
returns `<start>-<end>` for weekly reports. Email subject lines are untouched —
they carry no cumulative wording.

The `_jobsite_<id>` suffix is retained for job-site reports so two sites of the
same client generated in the same week cannot collide on disk.

Verified end to end: report emails already pass their `weekly` flag into
`getDownloadLinksText`, so a weekly email resolves `common.downloadReportsText`
regardless of link contents. No change was needed in `mail.service.ts` or
`buildFileLinkLabel`.

## Worked example

Cron fires Monday 2026-08-24 08:00. `getLastWeekDateRange()` returns
`startDate = 2026-08-17`, `endDate = 2026-08-23`.

Walbridge (`enabled = true`) has a weekly dashboard subscription including
Excel. The consumer generates
`weekly_report_Walbridge_2026-08-17_2026-08-23.xlsx` with a tab per Walbridge
job site. On a site that moved 4.2 t of wood waste and 1.1 t of metal that week:

```
Description | Start Date | End Date   | Quantity | Unit    | Supplier   | Activity
WOOD WASTE  | 2026-08-17 | 2026-08-23 | 4.2      | Tonnage | Woodchuck  | Biomass
METAL       | 2026-08-17 | 2026-08-23 | 1.1      | Tonnage | Woodchuck  | Recycled
```

The email links it as `2026-08-17-2026-08-23 Excel Report`, alongside the
unchanged weekly PDF and CSV links.

## Testing

Extends the existing stubbed-dependency pattern in
`ReportGeneration.consumer.spec.ts`; no new test infrastructure.

Run with `npx jest src/report-export src/queues/consumers`.

`src/report-export/client-excel-report.service.spec.ts` (new), with a stubbed
dumpster repository that honours the `Between(...)` bounds the service builds,
so date-window assertions test the real query range:

- A weekly run includes only dumpsters within Mon 00:00 → Sun 23:59:59; one
  dumpster the Sunday before and one the Monday after are both excluded.
- Emits exactly one row per waste stream, `Start Date` = Monday and
  `End Date` = Sunday.
- Zero-quantity waste streams are dropped.
- A job site with no activity that week still produces a header-only tab.
- Weekly and monthly runs emit the same seven headers in the same order.
- Weekly data ignores the job site's own start date (a site started months
  earlier reports only the week's tonnage, not its history).

`ReportGeneration.consumer.spec.ts` (extended):

- Enabled client + weekly EXCEL job → `generateWeeklyExcel` is called,
  `generateCumulativeExcel` is not, and `processExcelCsvFormat` is skipped.
- Enabled client + monthly EXCEL job → `generateCumulativeExcel` is still called.
- **Disabled** client + weekly EXCEL job → falls through to
  `processExcelCsvFormat` as today.
- Weekly PDF and weekly CSV never reach the client-format branch.
- Label regression: the weekly attachment key produces a label containing no
  "Cumulative"; the monthly key still produces one.

## Implementation

| Area | File |
|---|---|
| Workbook builder | `src/report-export/client-excel-report.service.ts` (renamed from `cumulative-excel.service.ts`) |
| Routing | `src/queues/consumers/ReportGeneration.consumer.ts` — `processClientFormatExcel`, `resolveWeeklyPeriod` |
| Wiring | `src/report-export/report-export.module.ts`, `client-report-config.service.ts`, `monthly-report-email-job.service.ts` (rename only) |
| Tests | `src/report-export/client-excel-report.service.spec.ts` (13), `src/queues/consumers/ReportGeneration.consumer.spec.ts` (+12) |

No change was required in `mail.service.ts`, `buildFileLinkLabel`, the cron
schedule, or the database.

## Known limitations, flagged not fixed

1. **Custom-range Excel export ignores the requested range.** The on-demand
   range flows (`processJobSiteRangeReport` ~line 557, and the dashboard
   equivalent ~line 1502) call `generateCumulativeAttachment`, which hardcodes
   `endOfMonth(subMonths(now, 1))`. A user picking an arbitrary range gets a
   report to last month's end instead. Pre-existing and independent of this
   ticket.
2. **Dead code.** `processCumulativeReports()` in
   `monthly-report-email-job.service.ts` (~line 982) has no callers and its
   email send is a commented-out TODO.
3. **Sites started in the current month are excluded from weekly reports.**
   `isJobSiteEligibleForReport` filters on calendar month, so a site started
   Aug 3 receives no weekly report until September. Pre-existing, affects PDF
   and CSV equally, and changing it would alter existing weekly behaviour this
   ticket requires be left intact.

## Risk

Cron scheduling and week-boundary maths use server-local time (`new Date()`,
`getDay()`), while the dumpster query casts formatted strings via
`new Date('yyyy-MM-dd')`. If the server timezone differs from the reporting
timezone, week boundaries can shift by a day. The monthly report has the same
characteristic; this change matches it rather than altering it. The Monday–Sunday
boundary is therefore exact in server-local time.

## Acceptance criteria mapping

| Criterion | Where satisfied |
|---|---|
| Walbridge receives the weekly Excel every Monday | Existing `EVERY_MONDAY_AT_08_00` cron, untouched |
| Weekly Excel matches the monthly format and structure | Single shared `generateExcelWithTabs` writer |
| Start Date always Monday, End Date always Sunday | `getLastWeekDateRange()`, passed through as the single period bucket |
| Only Monday–Sunday data included | Weekly period ignores the job site start date; `Between(weekStart, weekEnd 23:59:59)` |
| Columns and formatting match monthly | Shared writer — parity by construction |
| Weekly PDF/CSV unaffected | Branch is entered only for `ReportFormatEnum.EXCEL` |
| Monthly report unaffected | `generateCumulativeExcel` signature, filename, key, and label all unchanged |
| Enableable for other customers without significant code changes | Existing `client_report_config.enabled` boolean |
