import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModJobSiteDetails1718169484814 implements MigrationInterface {
  name = 'ModJobSiteDetails1718169484814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP CONSTRAINT "FK_0b498cad60a506c3f1ba952a31e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP CONSTRAINT "UQ_0b498cad60a506c3f1ba952a31e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP COLUMN "jobSiteDetailsId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_details" ADD "powerplantsId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18da4dec5a357e1c8ab8791112" ON "job_site_details" ("jobSiteId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_details" ADD CONSTRAINT "FK_d2a0249caeb500586006248bcca" FOREIGN KEY ("powerplantsId") REFERENCES "power_plants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site_details" DROP CONSTRAINT "FK_d2a0249caeb500586006248bcca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18da4dec5a357e1c8ab8791112"`,
    );

    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_details" DROP COLUMN "powerplantsId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD "jobSiteDetailsId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD CONSTRAINT "UQ_0b498cad60a506c3f1ba952a31e" UNIQUE ("jobSiteDetailsId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD CONSTRAINT "FK_0b498cad60a506c3f1ba952a31e" FOREIGN KEY ("jobSiteDetailsId") REFERENCES "job_site_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
