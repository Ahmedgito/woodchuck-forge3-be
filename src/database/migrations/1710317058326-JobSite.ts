import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSite1710317058326 implements MigrationInterface {
  name = 'JobSite1710317058326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "title" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "title"`);
  }
}
