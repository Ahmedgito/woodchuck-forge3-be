import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance indexes for the map-data and map-data-stats endpoints.
 *
 * 1. Composite index on job_site_wastestreams_dumpsters(jobSiteWastestreamsId, creationDate)
 *    - Covers every date-range filter on haul records (GROUP BY aggregate query,
 *      getJobsiteWastestream QB queries used for dashboard stats, etc.)
 *    - Without this, all date-range queries do a sequential scan of the entire table.
 *
 * 2. Index on jobsite_wastestream_locations(jobsiteWasteStreamId)
 *    - TypeORM loads locations via a separate IN-query keyed by this column.
 *    - Without this, every map-data request does a sequential scan of the
 *      locations table.
 */
export class AddMapDataPerformanceIndexes1776151223000
  implements MigrationInterface
{
  name = 'AddMapDataPerformanceIndexes1776151223000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_dumpers_ws_id_creation_date"
       ON "job_site_wastestreams_dumpsters" ("jobSiteWastestreamsId", "creationDate")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_jws_locations_jws_id"
       ON "jobsite_wastestream_locations" ("jobsiteWasteStreamId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_jws_locations_jws_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dumpers_ws_id_creation_date"`,
    );
  }
}
