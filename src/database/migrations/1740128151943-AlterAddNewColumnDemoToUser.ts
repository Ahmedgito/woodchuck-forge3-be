import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddNewColumnDemoToUser1740128151943
  implements MigrationInterface
{
  name = 'AlterAddNewColumnDemoToUser1740128151943';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "demo" boolean NOT NULL DEFAULT 'false'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "demo"`);
  }
}
