import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCamerLiveViewColumns1745316441540
  implements MigrationInterface
{
  name = 'AlterCamerLiveViewColumns1745316441540';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE camera_live_view ALTER COLUMN "s3ImageUrl" DROP NOT NULL;
    `);
    await queryRunner.query(`
        ALTER TABLE camera_live_view ALTER COLUMN "fillPercentage" DROP NOT NULL;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE public.camera_live_view ALTER COLUMN "fillPercentage" SET NOT NULL;
    `);
    await queryRunner.query(`
        ALTER TABLE public.camera_live_view ALTER COLUMN "s3ImageUrl" SET NOT NULL;
    `);
  }
}
