import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSite1709051058563 implements MigrationInterface {
  name = 'JobSite1709051058563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" ADD "mmrLocation" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "mmrLocation"`);
  }
}
