import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddColumnForCameraLiveView1735838908432
  implements MigrationInterface
{
  name = 'AlterAddColumnForCameraLiveView1735838908432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" ADD "captureCount" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" ADD "isOnline" boolean NOT NULL DEFAULT 'true'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" DROP COLUMN "isOnline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" DROP COLUMN "captureCount"`,
    );
  }
}
