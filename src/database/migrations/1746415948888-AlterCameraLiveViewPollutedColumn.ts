import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCameraLiveViewPollutedColumn1746415948888
  implements MigrationInterface
{
  name = 'AlterCameraLiveViewPollutedColumn1746415948888';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" ADD "isPolluted" boolean NOT NULL DEFAULT 'false'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" DROP COLUMN "isPolluted"`,
    );
  }
}
