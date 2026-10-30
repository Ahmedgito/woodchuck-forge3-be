import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCameraLiveViewAddRefreshColumn1745812675942
  implements MigrationInterface
{
  name = 'AlterCameraLiveViewAddRefreshColumn1745812675942';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" ADD "enableRefresh" boolean NOT NULL DEFAULT 'false'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" DROP COLUMN "enableRefresh"`,
    );
  }
}
