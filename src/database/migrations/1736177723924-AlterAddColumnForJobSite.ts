import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddColumnForJobSite1736177723924
  implements MigrationInterface
{
  name = 'AlterAddColumnForJobSite1736177723924';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" ADD "endClientId" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "endClientId"`);
  }
}
