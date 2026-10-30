import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModLocations1719399415860 implements MigrationInterface {
  name = 'ModLocations1719399415860';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" SET DEFAULT '2'`,
    );
  }
}
