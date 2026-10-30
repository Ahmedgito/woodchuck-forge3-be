import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDumpsterOptionalDistanceToMmr1718185590662
  implements MigrationInterface
{
  name = 'UpdateDumpsterOptionalDistanceToMmr1718185590662';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster" ALTER COLUMN "distanceToMmr" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster" ALTER COLUMN "distanceToMmr" SET NOT NULL`,
    );
  }
}
