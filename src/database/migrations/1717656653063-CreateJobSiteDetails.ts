import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobSiteDetails1717656653063 implements MigrationInterface {
  name = 'CreateJobSiteDetails1717656653063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_site_details" ("id" SERIAL NOT NULL, "address" character varying, "sustainabilityGoal" double precision, "size" double precision, "completedAt" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "jobSiteId" integer, CONSTRAINT "REL_18da4dec5a357e1c8ab8791112" UNIQUE ("jobSiteId"), CONSTRAINT "PK_8c209587745c60a2633fcc91726" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD "jobSiteDetailsId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD CONSTRAINT "UQ_0b498cad60a506c3f1ba952a31e" UNIQUE ("jobSiteDetailsId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD CONSTRAINT "FK_0b498cad60a506c3f1ba952a31e" FOREIGN KEY ("jobSiteDetailsId") REFERENCES "job_site_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD CONSTRAINT "FK_31fc2bbc01885195ace3ab2f2e9" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_details" ADD CONSTRAINT "FK_18da4dec5a357e1c8ab87911127" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site_details" DROP CONSTRAINT "FK_18da4dec5a357e1c8ab87911127"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP CONSTRAINT "FK_31fc2bbc01885195ace3ab2f2e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP CONSTRAINT "FK_0b498cad60a506c3f1ba952a31e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP CONSTRAINT "UQ_31fc2bbc01885195ace3ab2f2e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP COLUMN "jobSiteDetailsId"`,
    );
    await queryRunner.query(`DROP TABLE "job_site_details"`);
  }
}
