import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterJobsiteWasteStreamsTable1750134525432
  implements MigrationInterface
{
  name = 'AlterJobsiteWasteStreamsTable1750134525432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "jobsites_wastestreams"
        ADD "co2" numeric(10,2),
        ADD "wasteStreamTypeId" INTEGER,
        ADD CONSTRAINT "FK_wasteStreamType" FOREIGN KEY ("wasteStreamTypeId") REFERENCES "wastestream_types"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "jobsites_wastestreams"
        DROP CONSTRAINT "FK_wasteStreamType",
        DROP COLUMN "co2",
        DROP COLUMN "wasteStreamTypeId"
    `);
  }
}
