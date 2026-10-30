import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterHaulerTableMakeDumpsterSizeNullAble1718014522605
  implements MigrationInterface
{
  name = 'AlterHaulerTableMakeDumpsterSizeNullAble1718014522605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hauler" ALTER COLUMN "dumpsterSize" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hauler" ALTER COLUMN "dumpsterSize" SET NOT NULL`,
    );
  }
}
