import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddNewColumnForAdminCamera1732700921976
  implements MigrationInterface
{
  name = 'AlterAddNewColumnForAdminCamera1732700921976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera" ADD "isAdmin" boolean NOT NULL DEFAULT 'false'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "camera" DROP COLUMN "isAdmin"`);
  }
}
