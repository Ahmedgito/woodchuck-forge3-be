import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDumpsterSize1710157264227 implements MigrationInterface {
  name = 'UpdateDumpsterSize1710157264227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61a8461b18a7b910e965713cf3"`,
    );
    await queryRunner.query(`ALTER TABLE "hauler" DROP COLUMN "dumpsterSize"`);
    await queryRunner.query(`DROP TYPE "public"."hauler_dumpstersize_enum"`);
    await queryRunner.query(
      `ALTER TABLE "hauler" ADD "dumpsterSize" json NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hauler" DROP COLUMN "dumpsterSize"`);
    await queryRunner.query(
      `CREATE TYPE "public"."hauler_dumpstersize_enum" AS ENUM('10', '20', '30', '40')`,
    );
    await queryRunner.query(
      `ALTER TABLE "hauler" ADD "dumpsterSize" "public"."hauler_dumpstersize_enum" NOT NULL DEFAULT '10'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61a8461b18a7b910e965713cf3" ON "hauler" ("dumpsterSize") `,
    );
  }
}
