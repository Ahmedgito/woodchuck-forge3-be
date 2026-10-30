import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddConcreteColumnToJobSite1762401834320
  implements MigrationInterface
{
  name = 'AddConcreteColumnToJobSite1762401834320';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the concrete column
    await queryRunner.addColumn(
      'job_site',
      new TableColumn({
        name: 'concrete',
        type: 'numeric',
        precision: 10,
        scale: 2,
        default: '0',
        isNullable: false,
      }),
    );

    // Calculate and update concrete values for existing job sites
    // This calculates total weight from job site waste streams where waste stream name is 'CONCRETE'
    await queryRunner.query(`
      UPDATE "job_site" js
      SET "concrete" = COALESCE(
        (
          SELECT COALESCE(SUM(
            CASE 
              WHEN jsd."real_weight" IS NOT NULL AND jsd."real_weight" > 0 
              THEN jsd."real_weight"
              ELSE 
                CASE 
                  WHEN wtv."tons" IS NOT NULL AND vo."value" IS NOT NULL 
                  THEN (wtv."tons" * vo."value")
                  ELSE 0
                END
            END
          ), 0)
          FROM "jobsites_wastestreams" jws
          INNER JOIN "wastestreams" ws ON ws."id" = jws."wasteStreamId" AND ws."name" = 'CONCRETE'
          LEFT JOIN "job_site_wastestreams_dumpsters" jsd ON jsd."jobSiteWastestreamsId" = jws."id"
          LEFT JOIN "wastestream_types" wt ON wt."id" = jws."wasteStreamTypeId"
          LEFT JOIN "wastestream_type_vessels" wtv ON wtv."wasteStreamTypeId" = wt."id" AND wtv."vesselId" = jws."vesselId"
          LEFT JOIN "vessel_options" vo ON vo."id" = jws."vesselOptionId"
          WHERE jws."jobSiteId" = js."id"
        ),
        0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('job_site', 'concrete');
  }
}
