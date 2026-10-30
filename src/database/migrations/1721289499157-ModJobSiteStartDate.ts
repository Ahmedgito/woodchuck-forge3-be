import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModJobSiteStartDate1721289499157 implements MigrationInterface {
  name = 'ModJobSiteStartDate1721289499157';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" ADD "startDate" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "startDate"`);
  }
}
