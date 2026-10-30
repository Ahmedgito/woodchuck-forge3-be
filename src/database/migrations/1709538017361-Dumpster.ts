import { MigrationInterface, QueryRunner } from 'typeorm';

export class Dumpster1709538017361 implements MigrationInterface {
  name = 'Dumpster1709538017361';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dumpster" ("id" SERIAL NOT NULL, "sublocationName" character varying NOT NULL, "distanceToMmr" character varying NOT NULL, "unit" character varying NOT NULL DEFAULT 'miles', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "jobSiteId" integer, CONSTRAINT "PK_5ca69dedbdaad7ee70b545b2b57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster" ADD CONSTRAINT "FK_e4f9493a43c01d04c1bead21c0f" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster" DROP CONSTRAINT "FK_e4f9493a43c01d04c1bead21c0f"`,
    );
    await queryRunner.query(`DROP TABLE "dumpster"`);
  }
}
