import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSite1709195882127 implements MigrationInterface {
  name = 'JobSite1709195882127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "woodWasteRecycled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "woodWasteRecycled" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "diverted"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "diverted" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "refused"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "refused" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "co2Avoided"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "co2Avoided" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "totalHailed"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "totalHailed" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "totalTonnage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "totalTonnage" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "totalTonnage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "totalTonnage" integer`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "totalHailed"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "totalHailed" integer`);
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "co2Avoided"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "co2Avoided" integer`);
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "refused"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "refused" integer`);
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "diverted"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "diverted" integer`);
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "woodWasteRecycled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "woodWasteRecycled" integer`,
    );
  }
}
