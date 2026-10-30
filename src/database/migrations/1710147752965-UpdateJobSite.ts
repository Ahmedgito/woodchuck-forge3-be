import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateJobSite1710147752965 implements MigrationInterface {
  name = 'UpdateJobSite1710147752965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "haulerId"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "haulerId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "haulerId"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "haulerId" integer`);
  }
}
