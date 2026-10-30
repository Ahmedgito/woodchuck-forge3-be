# Cumulative Monthly Excel Report Feature

## Overview

The Cumulative Monthly Excel Report feature provides client-specific automated reporting that generates comprehensive Excel files containing historical waste stream data from job site creation date to the end of the previous month. Each job site is represented as a separate tab in the Excel workbook.

This feature was implemented specifically for the Walbridge client but is designed to be extensible to any client through database configuration.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Usage Guide](#usage-guide)
- [Implementation Details](#implementation-details)
- [Future Enhancements](#future-enhancements)
- [Known Issues & Bug Fixes](#known-issues--bug-fixes)
- [Testing Guidelines](#testing-guidelines)

## Features

- **Client-Specific Configuration**: Enable/disable cumulative reporting per client via database configuration
- **Historical Data**: Includes all data from job site creation date to end of previous month
- **Multi-Tab Excel**: Each job site gets its own tab in the Excel workbook
- **Monthly Aggregation**: Data is grouped by calendar month
- **Activity Mapping**: Waste streams are mapped to activities (Biomass, Recycled, Non-Recycled)
- **Automated Execution**: Runs automatically on the 1st of each month at 8:00 AM
- **Extensible Design**: Easy to enable for additional clients without code changes

## Architecture

### Components

1. **ClientReportConfig Module** (`src/client-report-config/`)
   - Manages client-specific configuration
   - CRUD operations for enabling/disabling cumulative reporting

2. **WasteStreamActivityMapping Module** (`src/waste-stream-activity-mapping/`)
   - Stores waste stream to activity mappings
   - Default mappings: Wood Waste → Biomass, Metal/Plastic/Concrete → Recycled, Waste Hauling + Landfill → Non-Recycled

3. **ClientExcelReportService** (`src/report-export/client-excel-report.service.ts`)
   - Core service for generating client-format Excel reports
   - Handles data aggregation and Excel generation
   - Shared with the weekly report — see
     [Weekly Client-Format Excel Report](./weekly-client-excel-report.md)

4. **Monthly Report Cron Job** (`src/cron/jobs/monthly-report-email-job.service.ts`)
   - Checks for enabled clients and triggers cumulative report generation

### Data Flow

```
Monthly Cron Job (1st of month)
    ↓
Check client_report_config for enabled clients
    ↓
For each enabled client:
    ↓
Get all job sites for client
    ↓
For each job site:
    ↓
Query historical waste stream data (creation date → end of previous month)
    ↓
Aggregate by month and waste stream type
    ↓
Generate Excel with tabs per job site
    ↓
Email report to subscribed users (TODO: Email template needed)
```

## Database Schema

### client_report_config Table

Stores which clients have cumulative reporting enabled.

```sql
CREATE TABLE client_report_config (
    id SERIAL PRIMARY KEY,
    "clientId" INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("clientId")
);
```

**Fields:**
- `id`: Primary key
- `clientId`: Foreign key to `user.id` (the client/user)
- `enabled`: Boolean flag indicating if cumulative reporting is enabled
- `createdAt`, `updatedAt`: Timestamps

### waste_stream_activity_mapping Table

Stores mappings from waste stream names to activity values.

```sql
CREATE TABLE waste_stream_activity_mapping (
    id SERIAL PRIMARY KEY,
    "wasteStreamName" VARCHAR(255) NOT NULL,
    activity VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("wasteStreamName")
);
```

**Default Mappings:**
- `WOOD WASTE` → `Biomass`
- `METAL` → `Recycled`
- `PLASTIC` → `Recycled`
- `CONCRETE` → `Recycled`
- `WASTE HAULING + LANDFILL` → `Non-Recycled`

## API Endpoints

All endpoints require admin authentication (`RoleEnum.admin`).

### Get All Enabled Clients

```
GET /client-report-config
```

Returns list of all clients with cumulative reporting enabled.

### Get Client Configuration

```
GET /client-report-config/:clientId
```

Returns configuration for a specific client.

### Check if Enabled

```
GET /client-report-config/:clientId/enabled
```

Returns `{ clientId: number, enabled: boolean }`.

### Enable Cumulative Reporting

```
POST /client-report-config/enable
Body: { "clientId": number, "enabled": true }
```

Enables cumulative reporting for a client.

### Disable Cumulative Reporting

```
POST /client-report-config/disable
Body: { "clientId": number, "enabled": false }
```

Disables cumulative reporting for a client.

### Toggle Status

```
PUT /client-report-config/toggle
Body: { "clientId": number, "enabled": boolean }
```

Toggles the enabled status for a client.

## Usage Guide

### Enabling Cumulative Reporting for a Client

#### Option 1: Via API (Recommended)

```bash
curl -X POST http://your-api/client-report-config/enable \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"clientId": 123, "enabled": true}'
```

#### Option 2: Direct Database Insert

```sql
INSERT INTO client_report_config ("clientId", "enabled", "createdAt", "updatedAt")
VALUES (123, true, NOW(), NOW())
ON CONFLICT ("clientId") DO UPDATE SET "enabled" = true, "updatedAt" = NOW();
```

### Excel Report Structure

Each Excel file contains:

- **Filename Format**: `cumulative_report_{clientName}_{YYYY-MM-DD}.xlsx`
- **Tabs**: One tab per job site (tab name = sanitized job site name, max 31 chars)
- **Columns**:
  1. Description - Waste stream name (WOOD WASTE, METAL, PLASTIC, CONCRETE, WASTE HAULING + LANDFILL)
  2. Start Date - First day of reporting month (YYYY-MM-DD)
  3. End Date - Last day of reporting month (YYYY-MM-DD)
  4. Quantity - Total confirmed tonnage for that stream in that month
  5. Unit - Always "Tonnage"
  6. Supplier - Always "Woodchuck"
  7. Activity - Mapped activity value (Biomass, Recycled, Non-Recycled)

### Example Excel Output

| Description | Start Date | End Date | Quantity | Unit | Supplier | Activity |
|-------------|------------|----------|----------|------|----------|----------|
| WOOD WASTE | 2025-08-01 | 2025-08-31 | 33.3 | Tonnage | Woodchuck | Biomass |
| METAL | 2025-08-01 | 2025-08-31 | 2.3 | Tonnage | Woodchuck | Recycled |
| WOOD WASTE | 2025-09-01 | 2025-09-30 | 556.1 | Tonnage | Woodchuck | Biomass |

## Implementation Details

### Key Files

- **Entities**:
  - `src/client-report-config/infrastructure/persistence/relational/entities/client-report-config.entity.ts`
  - `src/waste-stream-activity-mapping/infrastructure/persistence/relational/entities/waste-stream-activity-mapping.entity.ts`

- **Services**:
  - `src/client-report-config/client-report-config.service.ts`
  - `src/waste-stream-activity-mapping/waste-stream-activity-mapping.service.ts`
  - `src/report-export/client-excel-report.service.ts`

- **Cron Job**:
  - `src/cron/jobs/monthly-report-email-job.service.ts` (see `processCumulativeReports()` method)

- **Migrations**:
  - `src/database/migrations/1770633818000-CreateClientReportConfigTable.ts`
  - `src/database/migrations/1770633818001-CreateWasteStreamActivityMappingTable.ts`

### Data Query Logic

The cumulative report queries data from:

1. **Job Sites**: All job sites for the enabled client
2. **Waste Streams**: All waste streams associated with each job site
3. **Dumpsters**: All dumpster records (`job_site_wastestreams_dumpsters`) within the date range
   - Date range: `jobSite.createdAt` (or `jobSite.startDate`) to `end of previous month`
   - Uses `real_weight` if available, falls back to `estimated_weight`

### Monthly Aggregation

Data is aggregated by:
- Calendar month (using `creationDate` from dumpster records)
- Waste stream type (normalized to standard names)
- Sum of tonnage per month per stream

### Waste Stream Normalization

The service normalizes waste stream names to match the mapping table:
- Variations of "WOOD WASTE" → `WOOD WASTE`
- "METAL" → `METAL`
- "PLASTIC" → `PLASTIC`
- "CONCRETE" → `CONCRETE`
- "WASTE HAULING" or "LANDFILL" → `WASTE HAULING + LANDFILL`

## Future Enhancements

### High Priority

1. **Email Integration**
   - [ ] Create email template for cumulative reports
   - [ ] Implement email sending in `processCumulativeReports()`
   - [ ] Add email attachments (Excel file)
   - [ ] Handle email failures gracefully

2. **PDF/CSV Support**
   - [ ] Extend cumulative reports to PDF format
   - [ ] Extend cumulative reports to CSV format
   - [ ] Maintain same structure across all formats

3. **Report Customization**
   - [ ] Allow clients to customize report columns
   - [ ] Add filtering options (date range, waste stream types)
   - [ ] Support custom activity mappings per client

### Medium Priority

4. **Performance Optimization**
   - [ ] Add database indexes for faster queries
   - [ ] Implement caching for activity mappings
   - [ ] Optimize dumpster query for large datasets
   - [ ] Add pagination for clients with many job sites

5. **Error Handling**
   - [ ] Add retry logic for failed report generations
   - [ ] Log errors to monitoring system (Sentry)
   - [ ] Send alerts for failed reports
   - [ ] Add validation for date ranges

6. **Testing**
   - [x] Add unit tests for `ClientExcelReportService` (`src/report-export/client-excel-report.service.spec.ts`)
   - [ ] Add integration tests for cron job
   - [ ] Add E2E tests for API endpoints
   - [ ] Test with large datasets (1000+ job sites)

### Low Priority

7. **UI/Admin Panel**
   - [ ] Add admin UI to enable/disable cumulative reporting
   - [ ] Show report generation history
   - [ ] Allow manual report generation
   - [ ] Preview report before generation

8. **Reporting Enhancements**
   - [ ] Add summary statistics tab
   - [ ] Add charts/graphs to Excel
   - [ ] Support multiple date ranges in single report
   - [ ] Add comparison reports (month-over-month)

## Known Issues & Bug Fixes

### Current Issues

1. **Email Not Implemented**
   - **Status**: TODO
   - **Impact**: Reports are generated but not emailed
   - **Location**: `src/cron/jobs/monthly-report-email-job.service.ts:804-816`
   - **Fix**: Implement email template and sending logic

2. **Date Range Edge Cases**
   - **Status**: Needs Testing
   - **Impact**: May not handle job sites created on month boundaries correctly
   - **Location**: `src/report-export/client-excel-report.service.ts:getPeriodDataForJobSite()`
   - **Fix**: Add comprehensive date range testing

3. **Waste Stream Name Variations**
   - **Status**: Partial Fix
   - **Impact**: Some waste stream name variations may not be normalized correctly
   - **Location**: `src/report-export/client-excel-report.service.ts:normalizeWasteStreamName()`
   - **Fix**: Expand normalization logic based on actual data

4. **Large Dataset Performance**
   - **Status**: Not Tested
   - **Impact**: May be slow for clients with many job sites or long history
   - **Location**: `src/report-export/client-excel-report.service.ts:aggregateDataByMonth()`
   - **Fix**: Add pagination and batch processing

### Fixed Issues

1. **TypeScript Compilation Errors**
   - **Status**: Fixed
   - **Fix**: Corrected import paths and return types

2. **Query Builder for Dumpsters**
   - **Status**: Fixed
   - **Fix**: Changed from `find()` to `createQueryBuilder()` for proper joins

## Testing Guidelines

### Manual Testing

1. **Enable Cumulative Reporting**
   ```bash
   # Enable for test client
   POST /client-report-config/enable
   Body: { "clientId": <test_client_id>, "enabled": true }
   ```

2. **Verify Configuration**
   ```bash
   GET /client-report-config/:clientId/enabled
   # Should return: { "clientId": <id>, "enabled": true }
   ```

3. **Trigger Report Generation** (for testing)
   ```typescript
   // In development, manually call:
   await reportEmailJobService.processCumulativeReports();
   ```

4. **Verify Excel Output**
   - Check file is created in project root
   - Verify filename format
   - Open Excel file and verify:
     - Correct number of tabs (one per job site)
     - Correct column headers
     - Data is aggregated by month
     - Activity mappings are correct
     - Dates are in correct format

### Test Cases

1. **Single Job Site**
   - Client with one job site
   - Verify single tab in Excel
   - Verify all months from creation to previous month end

2. **Multiple Job Sites**
   - Client with multiple job sites
   - Verify multiple tabs
   - Verify each tab has correct data

3. **No Data**
   - Client with no dumpster records
   - Verify empty Excel or "No Data" message

4. **Edge Cases**
   - Job site created in current month (should exclude)
   - Job site with no waste streams
   - Job site with only one month of data
   - Very old job site (many months of data)

5. **Activity Mapping**
   - Verify all waste stream types map correctly
   - Test with unknown waste stream names
   - Verify fallback to defaults

### Database Testing

```sql
-- Test query for enabled clients
SELECT c.*, u.name, u.username 
FROM client_report_config c
JOIN "user" u ON c."clientId" = u.id
WHERE c.enabled = true;

-- Test activity mappings
SELECT * FROM waste_stream_activity_mapping;

-- Test data aggregation (example)
SELECT 
    js.title as job_site,
    ws.name as waste_stream,
    DATE_TRUNC('month', d."creationDate") as month,
    SUM(COALESCE(d.real_weight, d.estimated_weight, 0)) as total_tonnage
FROM job_site js
JOIN jobsites_wastestreams jws ON js.id = jws."jobSiteId"
JOIN wastestreams ws ON jws."wasteStreamId" = ws.id
JOIN job_site_wastestreams_dumpsters d ON jws.id = d."jobSiteWastestreamsId"
WHERE js."clientId" = <client_id>
GROUP BY js.title, ws.name, DATE_TRUNC('month', d."creationDate")
ORDER BY month, ws.name;
```

## Migration Guide

### Running Migrations

```bash
# Run migrations
npm run migration:run

# Or using TypeORM CLI
npx typeorm migration:run -d src/database/config/database.config.ts
```

### Verifying Migrations

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('client_report_config', 'waste_stream_activity_mapping');

-- Check seed data
SELECT * FROM waste_stream_activity_mapping;
```

## Support & Maintenance

### Logs

Cumulative report generation logs are output to console:
- `Starting monthly report email job...`
- `Processing cumulative reports for enabled clients...`
- `Generating cumulative report for client {id}...`
- `Cumulative report generated: {filename} for client {id}`

### Monitoring

Monitor for:
- Failed report generations (check error logs)
- Missing Excel files
- Clients with no job sites (expected, but log for visibility)
- Long-running report generations (may indicate performance issues)

### Troubleshooting

**Issue**: Reports not generating
- Check if client is enabled: `SELECT * FROM client_report_config WHERE enabled = true`
- Check cron job is running: Verify cron expression in `CRON_EXPRESSIONS.EVERY_1ST_DAY_OF_MONTH_AT_08_00`
- Check logs for errors

**Issue**: Excel file missing data
- Verify job sites exist for client
- Verify dumpster records exist with `creationDate` in range
- Check date range calculation logic

**Issue**: Wrong activity mappings
- Verify mappings in database: `SELECT * FROM waste_stream_activity_mapping`
- Check waste stream name normalization logic
- Verify fallback defaults are correct

## Changelog

### Version 1.0.0 (Initial Implementation)
- Created `client_report_config` table
- Created `waste_stream_activity_mapping` table with default mappings
- Implemented `ClientExcelReportService` for Excel generation
- Integrated with monthly cron job
- Added API endpoints for configuration management
- Basic error handling and logging

---

**Last Updated**: February 2026
**Maintained By**: Development Team
**Related Tickets**: JIRA-XXX (Monthly Cumulative Excel for Walbridge Client)
