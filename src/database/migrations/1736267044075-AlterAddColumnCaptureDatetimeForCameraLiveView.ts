import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAddColumnCaptureDatetimeForCameraLiveView1736267044075
  implements MigrationInterface
{
  name = 'AlterAddColumnCaptureDatetimeForCameraLiveView1736267044075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" ADD "captureDatetime" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera_live_view" DROP COLUMN "captureDatetime"`,
    );
  }
}
