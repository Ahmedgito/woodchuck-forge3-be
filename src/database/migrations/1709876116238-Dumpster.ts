import { MigrationInterface, QueryRunner } from 'typeorm';

export class Dumpster1709876116238 implements MigrationInterface {
  name = 'Dumpster1709876116238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster" ALTER COLUMN "sublocationName" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster" ALTER COLUMN "sublocationName" SET NOT NULL`,
    );
  }
}
