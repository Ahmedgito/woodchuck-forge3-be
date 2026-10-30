import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDumpsterStatus1710658223392 implements MigrationInterface {
  name = 'UpdateDumpsterStatus1710658223392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" DROP COLUMN "miles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" ADD "miles" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" DROP COLUMN "waste"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" ADD "waste" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" DROP COLUMN "waste"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" ADD "waste" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" DROP COLUMN "miles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" ADD "miles" integer`,
    );
  }
}
