# Plan: S3-backed report delivery (`s3Link` + `piz` uploads)

## Goal

Add a new `s3Link` compression option. When a subscription's `compressionExtension`
is `piz` or `s3Link`, upload the generated report archive to the S3 bucket
`client-reports` and include a downloadable link in the report email.

- `s3Link` → upload the **.zip** archive to S3; email contains the link only (no attachment).
- `piz` → rename to **.piz**, upload the .piz to S3; email contains the link only
  (no attachment — email clients block .piz attachments as well).
- `zip` → unchanged (attachment only, no upload).

## Link longevity constraint

S3 presigned URLs expire after at most 7 days, but clients must be able to open the
link 1+ years later. Solution: the email contains a **permanent backend URL**

```
{BACKEND_DOMAIN}/api/v1/report-downloads/file?key=<s3-key>
```

which generates a fresh presigned URL (1 hour) on every request and 302-redirects to
it. The bucket stays private; the S3 key embeds a UUID so links are unguessable.
The endpoint is public (marked with the existing `@SkipAll()` decorator) since email
recipients are not logged in.

## Changes

1. **Enum** — `CompressionExtensionEnum.S3_LINK = 's3Link'` + migration
   `ALTER TYPE "report_subscriptions_compressionextension_enum" ADD VALUE 's3Link'`.
2. **Config** — `file.awsClientReportsS3Bucket` (env `AWS_CLIENT_REPORTS_S3_BUCKET`,
   default `client-reports`); documented in `env-example-document`.
3. **New module `src/report-downloads/`**
   - `ReportS3StorageService.uploadReportArchive(attachment)` → puts the file at
     `reports/{yyyy-MM}/{uuid}/{filename}`, returns `{ key, downloadUrl }`.
   - `ReportDownloadsController` — `GET /report-downloads/file?key=...` (public) →
     302 redirect to fresh presigned URL. Keys must start with `reports/`.
4. **Consumer (`ReportGeneration.consumer.ts`)** — in the job-site monthly email flow
   (the only place `compressionExtension` applies): after applying the extension,
   upload archives for `piz`/`s3Link`, build `downloadLinks`, and for `s3Link` send
   no attachments.
5. **Mail** — optional `downloadLinks: { filename, url }[]` param on
   `sendMonthlyReportEmail`, `sendMonthlyReportAdminEmail`, `archiveReportsEmail`;
   rendered as a link list in the matching templates with a "Download your report(s)"
   i18n line.

## Out of scope

- Dashboard report flows (compressionExtension has never applied there).
- Bucket creation/lifecycle policy — the `client-reports` bucket must exist and
  have no expiry lifecycle rule (links must work after 1 year).
