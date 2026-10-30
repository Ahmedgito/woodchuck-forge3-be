import { MigrationInterface, QueryRunner } from 'typeorm';

export class DumpsterStatus1710307492203 implements MigrationInterface {
  name = 'DumpsterStatus1710307492203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" ADD "dumspterCount" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" DROP COLUMN "dumspterCount"`,
    );
  }
}
