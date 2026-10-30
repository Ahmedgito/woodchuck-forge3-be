# Report Debugging Queries

This document lists SQL queries against the `report_log` table for debugging the
monthly/weekly cron-driven report pipeline.

## Schema reference

The `report_log` table is populated by `ReportLoggerService` from two main
sources:

- `ReportEmailJobService` (cron-level: subscription fetching, queuing)
- `ReportGenerationConsumer` (Bull worker: per-report processing, file
  generation, email delivery)

Columns:

| Column      | Type    | Notes                                                |
| ----------- | ------- | ---------------------------------------------------- |
| `id`        | int     | Primary key                                          |
| `level`     | enum    | `log`, `warn`, `error`                               |
| `context`   | varchar | Source class (e.g. `ReportEmailJobService`)          |
| `message`   | text    | Human-readable summary                               |
| `metadata`  | jsonb   | Structured fields (email, jobId, durationMs, etc.)   |
| `createdAt` | timestamp | Auto-generated                                     |

## Quick health checks

### Did the cron run today?

```sql
SELECT level, message, "createdAt"
FROM report_log
WHERE message ILIKE 'Starting%report email job%'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
```

### Did the cron complete successfully?

```sql
SELECT
  level,
  message,
  metadata->>'frequency'      AS frequency,
  metadata->>'totalQueued'    AS total_queued,
  metadata->>'jobSiteQueued'  AS job_site_queued,
  metadata->>'dashboardQueued' AS dashboard_queued,
  metadata->>'durationMs'     AS duration_ms,
  "createdAt"
FROM report_log
WHERE message LIKE '%report email job completed%'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Show all errors from the last 24 hours

```sql
SELECT
  context,
  message,
  metadata->>'jobId'   AS job_id,
  metadata->>'email'   AS email,
  metadata->>'error'   AS error,
  "createdAt"
FROM report_log
WHERE level = 'error'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
```

## Subscription analysis

### How many subscriptions were processed in the last cron run?

```sql
SELECT
  message,
  metadata->>'frequency'              AS frequency,
  metadata->>'totalSubscriptions'     AS total,
  metadata->>'jobSiteEligible'        AS job_site,
  metadata->>'dashboardSubscriptions' AS dashboard,
  metadata->>'filteredOutCount'       AS filtered,
  "createdAt"
FROM report_log
WHERE message LIKE 'Subscriptions fetched%'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Which job sites were filtered out and why?

```sql
SELECT
  metadata->>'frequency' AS frequency,
  jsonb_array_elements(metadata->'filteredOutJobSites') AS filtered_site,
  "createdAt"
FROM report_log
WHERE message LIKE '%filtered out%'
ORDER BY "createdAt" DESC
LIMIT 50;
```

The `filtered_site` JSON contains: `jobSiteId`, `jobSiteName`, `userEmail`, `reason`.

## Per-user lifecycle trace

### Trace every event for a specific user

```sql
SELECT
  level,
  context,
  message,
  metadata,
  "createdAt"
FROM report_log
WHERE metadata->>'email' = 'user@example.com'
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" ASC;
```

A complete lifecycle for one PDF dashboard report should show 5–6 rows:

1. `Subscriptions fetched ...`
2. `Queued dashboard report — user: user@example.com`
3. `Job <id> started — type: dashboard | user: user@example.com | attempt 1/3`
4. `PDF dashboard report generated — user: user@example.com`
5. `Email sent to user@example.com — dashboard report | attachments: 1 (245KB)`
6. `Job <id> completed — type: dashboard | user: user@example.com | duration: 8200ms`

### Trace every event for a specific job-site

```sql
SELECT
  level,
  message,
  metadata->>'email'  AS email,
  metadata->>'format' AS format,
  metadata->>'jobId'  AS job_id,
  "createdAt"
FROM report_log
WHERE metadata->>'jobSiteId' = '134'
   OR metadata->'jobSiteIds' @> '134'::jsonb
ORDER BY "createdAt" ASC;
```

### Trace every event for a Bull job ID

```sql
SELECT
  level,
  message,
  metadata->>'attempt' AS attempt,
  metadata->>'durationMs' AS duration_ms,
  metadata->>'error' AS error,
  "createdAt"
FROM report_log
WHERE metadata->>'jobId' = '380'
ORDER BY "createdAt" ASC;
```

## File generation & email delivery

### Show all email deliveries (with attachment sizes)

```sql
SELECT
  metadata->>'email'              AS email,
  message,
  metadata->>'attachmentCount'    AS file_count,
  metadata->>'attachmentTotalKb'  AS total_kb,
  metadata->>'attachmentFiles'    AS filenames,
  metadata->>'weekly'             AS is_weekly,
  "createdAt"
FROM report_log
WHERE message LIKE 'Email sent%'
ORDER BY "createdAt" DESC
LIMIT 50;
```

### Find emails that were sent with zero attachments

```sql
SELECT
  metadata->>'email' AS email,
  message,
  "createdAt"
FROM report_log
WHERE message LIKE 'Email sent%'
  AND (metadata->>'attachmentCount')::int = 0
ORDER BY "createdAt" DESC;
```

### Find suspiciously small/empty attachments

```sql
SELECT
  metadata->>'email' AS email,
  metadata->>'attachmentCount' AS count,
  (metadata->>'attachmentTotalKb')::int AS total_kb,
  metadata->>'attachmentFiles' AS files,
  "createdAt"
FROM report_log
WHERE message LIKE 'Email sent%'
  AND (metadata->>'attachmentTotalKb')::int < 50
ORDER BY total_kb ASC, "createdAt" DESC;
```

### Format breakdown — which formats were generated successfully?

```sql
SELECT
  metadata->>'format'      AS format,
  metadata->>'reportType'  AS report_type,
  metadata->>'isCumulative' AS cumulative,
  COUNT(*)                  AS count
FROM report_log
WHERE message LIKE '%generated%' OR message LIKE 'Report sent%'
  AND "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY count DESC;
```

## Report type & format tracking

These queries answer the question **"which kind of report did each user
receive?"** — including whether Excel was generated as cumulative or standard.

### Who received cumulative reports vs standard Excel?

```sql
SELECT
  metadata->>'email'        AS email,
  metadata->>'clientName'   AS client_name,
  metadata->>'reportType'   AS report_type,
  metadata->>'format'       AS format,
  metadata->>'isCumulative' AS is_cumulative,
  metadata->>'jobSiteId'    AS job_site_id,
  "createdAt"
FROM report_log
WHERE message LIKE 'Report sent%'
ORDER BY "createdAt" DESC
LIMIT 100;
```

### Only cumulative recipients (last 30 days)

```sql
SELECT
  metadata->>'email'      AS email,
  metadata->>'clientName' AS client_name,
  metadata->>'clientId'   AS client_id,
  metadata->>'reportType' AS report_type,
  metadata->>'jobSiteId'  AS job_site_id,
  "createdAt"
FROM report_log
WHERE message LIKE 'Report sent%'
  AND metadata->>'isCumulative' = 'true'
  AND "createdAt" > NOW() - INTERVAL '30 days'
ORDER BY "createdAt" DESC;
```

### Only standard (non-cumulative) Excel/CSV recipients (last 30 days)

```sql
SELECT
  metadata->>'email'       AS email,
  metadata->>'reportType'  AS report_type,
  metadata->>'format'      AS format,
  metadata->>'jobSiteId'   AS job_site_id,
  metadata->>'userId'      AS user_id,
  "createdAt"
FROM report_log
WHERE message LIKE 'Report sent%'
  AND metadata->>'isCumulative' = 'false'
  AND "createdAt" > NOW() - INTERVAL '30 days'
ORDER BY "createdAt" DESC;
```

### Did a specific user get cumulative or standard Excel?

```sql
SELECT
  metadata->>'reportType'   AS report_type,
  metadata->>'format'       AS format,
  metadata->>'isCumulative' AS is_cumulative,
  metadata->>'jobSiteId'    AS job_site_id,
  message,
  "createdAt"
FROM report_log
WHERE metadata->>'email' = 'user@example.com'
  AND message LIKE 'Report sent%'
ORDER BY "createdAt" DESC;
```

### Cumulative vs standard counts per client

```sql
SELECT
  metadata->>'clientName' AS client_name,
  metadata->>'clientId'   AS client_id,
  metadata->>'isCumulative' AS is_cumulative,
  COUNT(*) AS report_count
FROM report_log
WHERE message LIKE 'Report sent%'
  AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3
ORDER BY client_name, is_cumulative DESC;
```

### Full delivery summary per user (last cron run)

Shows for each user: which formats were generated, whether cumulative was used,
and whether the email was actually sent (with file count + size).

```sql
WITH latest_run AS (
  SELECT MAX("createdAt") AS run_started
  FROM report_log
  WHERE message LIKE 'Starting%report email job%'
),
formats AS (
  SELECT
    metadata->>'email'        AS email,
    metadata->>'reportType'   AS report_type,
    metadata->>'format'       AS format,
    metadata->>'isCumulative' AS is_cumulative,
    metadata->>'jobSiteId'    AS job_site_id
  FROM report_log, latest_run
  WHERE message LIKE 'Report sent%'
    AND "createdAt" >= latest_run.run_started
),
emails AS (
  SELECT
    metadata->>'email' AS email,
    (metadata->>'attachmentCount')::int AS attachment_count,
    (metadata->>'attachmentTotalKb')::int AS attachment_kb,
    metadata->>'attachmentFiles' AS attachment_files
  FROM report_log, latest_run
  WHERE message LIKE 'Email sent%'
    AND "createdAt" >= latest_run.run_started
)
SELECT
  f.email,
  f.report_type,
  f.format,
  f.is_cumulative,
  f.job_site_id,
  e.attachment_count,
  e.attachment_kb,
  e.attachment_files
FROM formats f
LEFT JOIN emails e ON f.email = e.email
ORDER BY f.email, f.report_type, f.format;
```

### Did the user get a PDF this run? (PDF success log)

PDF generation does not flow through the `Report sent` log line — it has its
own `PDF ... report generated` message:

```sql
SELECT
  metadata->>'email'      AS email,
  metadata->>'reportType' AS report_type,
  metadata->>'jobSiteId'  AS job_site_id,
  message,
  "createdAt"
FROM report_log
WHERE message LIKE 'PDF%report generated%'
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

### Side-by-side: what was queued vs what was generated

Sometimes a report is queued but never completes. This query joins queue
events to generation events for a given user:

```sql
SELECT
  q.message AS queued_event,
  q."createdAt" AS queued_at,
  g.message AS generated_event,
  g."createdAt" AS generated_at,
  EXTRACT(EPOCH FROM (g."createdAt" - q."createdAt")) AS seconds_to_generate
FROM report_log q
LEFT JOIN report_log g
  ON g.metadata->>'email' = q.metadata->>'email'
  AND (
    g.message LIKE 'Report sent%'
    OR g.message LIKE 'PDF%report generated%'
  )
  AND g."createdAt" >= q."createdAt"
  AND g."createdAt" < q."createdAt" + INTERVAL '1 hour'
WHERE q.message LIKE 'Queued%'
  AND q.metadata->>'email' = 'user@example.com'
ORDER BY q."createdAt" DESC;
```

## Performance analysis

### Slowest report generation jobs

```sql
SELECT
  metadata->>'jobId'   AS job_id,
  metadata->>'type'    AS type,
  metadata->>'email'   AS email,
  (metadata->>'durationMs')::int AS duration_ms,
  "createdAt"
FROM report_log
WHERE message LIKE 'Job%completed%'
  AND metadata ? 'durationMs'
ORDER BY duration_ms DESC NULLS LAST
LIMIT 20;
```

### Average / max generation time by report type

```sql
SELECT
  metadata->>'type' AS type,
  COUNT(*) AS jobs,
  ROUND(AVG((metadata->>'durationMs')::int)) AS avg_ms,
  MAX((metadata->>'durationMs')::int)        AS max_ms,
  MIN((metadata->>'durationMs')::int)        AS min_ms
FROM report_log
WHERE message LIKE 'Job%completed%'
  AND metadata ? 'durationMs'
  AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY 1;
```

### Cron run duration history

```sql
SELECT
  metadata->>'frequency' AS frequency,
  metadata->>'totalQueued' AS queued,
  (metadata->>'durationMs')::int AS duration_ms,
  "createdAt"
FROM report_log
WHERE message LIKE '%report email job completed%'
ORDER BY "createdAt" DESC
LIMIT 30;
```

## Failure analysis

### Failed jobs with retry information

```sql
SELECT
  metadata->>'jobId'        AS job_id,
  metadata->>'email'        AS email,
  metadata->>'type'         AS type,
  metadata->>'attempt'      AS attempt,
  metadata->>'maxAttempts'  AS max_attempts,
  metadata->>'error'        AS error,
  "createdAt"
FROM report_log
WHERE level = 'error'
  AND message LIKE 'Job%failed%'
ORDER BY "createdAt" DESC
LIMIT 30;
```

### Per-format generation failures

```sql
SELECT
  metadata->>'format'    AS format,
  metadata->>'siteId'    AS job_site_id,
  metadata->>'userId'    AS user_id,
  metadata->>'error'     AS error,
  "createdAt"
FROM report_log
WHERE level = 'error'
  AND message LIKE 'Failed to generate%'
ORDER BY "createdAt" DESC
LIMIT 50;
```

### Queue failures (cron-side, before Bull)

```sql
SELECT
  level,
  message,
  metadata->>'email'      AS email,
  metadata->>'jobSiteId'  AS job_site_id,
  metadata->>'error'      AS error,
  "createdAt"
FROM report_log
WHERE context = 'ReportEmailJobService'
  AND level = 'error'
ORDER BY "createdAt" DESC;
```

## Daily summary report

A single query for an at-a-glance picture of the latest cron run:

```sql
WITH latest AS (
  SELECT MAX("createdAt") AS run_started
  FROM report_log
  WHERE message LIKE 'Starting%report email job%'
)
SELECT
  level,
  context,
  message,
  metadata,
  "createdAt"
FROM report_log, latest
WHERE "createdAt" >= latest.run_started
ORDER BY "createdAt" ASC;
```

## Operational tips

- **Indexes**: For better filtering performance on large log tables, consider
  adding GIN indexes on `metadata` and B-tree indexes on `level`, `context`,
  and `("createdAt" DESC)`.

  ```sql
  CREATE INDEX IF NOT EXISTS idx_report_log_metadata_gin   ON report_log USING gin (metadata);
  CREATE INDEX IF NOT EXISTS idx_report_log_created_at     ON report_log ("createdAt" DESC);
  CREATE INDEX IF NOT EXISTS idx_report_log_level_context  ON report_log (level, context);
  ```

- **Retention**: Add a periodic cleanup task to prevent unbounded growth, e.g.:

  ```sql
  DELETE FROM report_log WHERE "createdAt" < NOW() - INTERVAL '90 days';
  ```

- **Manual trigger**: If you need to reproduce a cron run for debugging, hit
  the admin endpoints (see `src/cron/cron.controller.ts`):
  - `POST /v1/cron/trigger-monthly-report`
  - `POST /v1/cron/trigger-weekly-report`
  - `POST /v1/cron/trigger-weekly-overview-email`

  Both must be called with an admin Bearer JWT.
