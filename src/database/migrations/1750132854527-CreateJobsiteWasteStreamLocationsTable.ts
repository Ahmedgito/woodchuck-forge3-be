import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsiteWasteStreamLocationsTable1750132854527
  implements MigrationInterface
{
  name = 'CreateJobsiteWasteStreamLocationsTable1750132854527';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "jobsite_wastestream_locations" (
        "id" SERIAL NOT NULL,
        "jobsiteWasteStreamId" INTEGER NOT NULL,
        "type" INTEGER NOT NULL,
        "locationId" INTEGER,
        "powerplantId" INTEGER,
        "haulerId" INTEGER,
        "distance" numeric(10,2),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jws_locations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_jws_location_jws" FOREIGN KEY ("jobsiteWasteStreamId") REFERENCES "jobsites_wastestreams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_jws_location_location" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_jws_location_powerplant" FOREIGN KEY ("powerplantId") REFERENCES "power_plants"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_jws_location_hauler" FOREIGN KEY ("haulerId") REFERENCES "hauler"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "jobsite_wastestream_locations"`);
  }
}
