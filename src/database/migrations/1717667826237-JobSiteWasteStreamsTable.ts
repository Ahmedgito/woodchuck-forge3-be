import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSiteWasteStreamsTable1717667826237
  implements MigrationInterface
{
  name = 'JobSiteWasteStreamsTable1717667826237';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."jobsites_wastestreams_dumpster_type_enum" AS ENUM('frontload_2yd','frontload_4yd','frontload_6yd','frontload_8yd','rolloff_10yd','rolloff_20yd','rolloff_30yd','rolloff_40yd','compactors_30yd','compactors_40yd')`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobsites_wastestreams" ("id" SERIAL NOT NULL, "dumpster_type" "public"."jobsites_wastestreams_dumpster_type_enum" NOT NULL, "distance" double precision NOT NULL, "jobSiteId" integer, "wasteStreamId" integer, "locationId" integer, "dumpsterId" integer, "haulerId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_d351a22ef3d1f64384dce887712" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4aa4568feb54235e79ee44547a" ON "jobsites_wastestreams" ("jobSiteId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7150cf088eba60bc1f22a9caf1" ON "jobsites_wastestreams" ("wasteStreamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_02f4d511684862b7781d421f01" ON "jobsites_wastestreams" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_302048e23cc2a992f941c0c82b" ON "jobsites_wastestreams" ("dumpsterId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b452bde26fd6c721241d32944c" ON "jobsites_wastestreams" ("haulerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD CONSTRAINT "FK_4aa4568feb54235e79ee44547af" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD CONSTRAINT "FK_7150cf088eba60bc1f22a9caf15" FOREIGN KEY ("wasteStreamId") REFERENCES "wastestreams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD CONSTRAINT "FK_02f4d511684862b7781d421f013" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD CONSTRAINT "FK_302048e23cc2a992f941c0c82b3" FOREIGN KEY ("dumpsterId") REFERENCES "dumpster"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD CONSTRAINT "FK_b452bde26fd6c721241d32944c6" FOREIGN KEY ("haulerId") REFERENCES "hauler"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP CONSTRAINT "FK_b452bde26fd6c721241d32944c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP CONSTRAINT "FK_302048e23cc2a992f941c0c82b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP CONSTRAINT "FK_02f4d511684862b7781d421f013"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP CONSTRAINT "FK_7150cf088eba60bc1f22a9caf15"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP CONSTRAINT "FK_4aa4568feb54235e79ee44547af"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b452bde26fd6c721241d32944c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_302048e23cc2a992f941c0c82b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_02f4d511684862b7781d421f01"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7150cf088eba60bc1f22a9caf1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4aa4568feb54235e79ee44547a"`,
    );
    await queryRunner.query(`DROP TABLE "jobsites_wastestreams"`);
    await queryRunner.query(
      `DROP TYPE "public"."jobsites_wastestreams_dumpster_type_enum"`,
    );
  }
}
