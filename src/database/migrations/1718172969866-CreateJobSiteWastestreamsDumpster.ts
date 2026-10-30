import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobSiteWastestreamsDumpster1718172969866
  implements MigrationInterface
{
  name = 'CreateJobSiteWastestreamsDumpster1718172969866';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_site_wastestreams_dumpsters" ("id" SERIAL NOT NULL, "estimated_weight" double precision, "real_weight" double precision, "creationDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "jobSiteWastestreamsId" integer, CONSTRAINT "PK_f0fc57bbab24c947dce6239ae1e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84dee86c9010021b30bfe89410" ON "job_site_wastestreams_dumpsters" ("jobSiteWastestreamsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_wastestreams_dumpsters" ADD CONSTRAINT "FK_84dee86c9010021b30bfe894109" FOREIGN KEY ("jobSiteWastestreamsId") REFERENCES "jobsites_wastestreams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site_wastestreams_dumpsters" DROP CONSTRAINT "FK_84dee86c9010021b30bfe894109"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84dee86c9010021b30bfe89410"`,
    );
    await queryRunner.query(`DROP TABLE "job_site_wastestreams_dumpsters"`);
  }
}
