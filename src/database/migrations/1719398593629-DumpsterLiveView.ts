import { MigrationInterface, QueryRunner } from 'typeorm';

export class DumpsterLiveView1719398593629 implements MigrationInterface {
  name = 'DumpsterLiveView1719398593629';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dumpster_live_view" ("id" SERIAL NOT NULL, "s3ImageUrl" character varying, "fillPercentage" integer, "gateId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "jobSiteId" integer, CONSTRAINT "PK_de375d943947c46a0d9dd3ebfcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_live_view" ADD CONSTRAINT "FK_6622acd9919af52250529c76f76" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster_live_view" DROP CONSTRAINT "FK_6622acd9919af52250529c76f76"`,
    );
    await queryRunner.query(`DROP TABLE "dumpster_live_view"`);
  }
}
