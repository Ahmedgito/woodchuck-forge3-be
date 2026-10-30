import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddColumnForFolio3FillLevel1743741007313
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" ADD "folio3FillPercentage" double precision DEFAULT 0 NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" DROP COLUMN "folio3FillPercentage"`,
    );
  }
}
