import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddNewColumnsForJobsites1718272750939
  implements MigrationInterface
{
  name = 'AlterAddNewColumnsForJobsites1718272750939';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "woodWasteDiverted" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "cardBoard" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "wasteHauling" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "metal" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "plastic" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "biomassForCleanEnergy" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ALTER COLUMN "statusId" SET DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "biomassForCleanEnergy"`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "plastic"`);
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "metal"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "wasteHauling"`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "cardBoard"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP COLUMN "woodWasteDiverted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ALTER COLUMN "statusId" DROP DEFAULT`,
    );
  }
}
