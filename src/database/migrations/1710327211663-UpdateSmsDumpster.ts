import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSmsDumpster1710327211663 implements MigrationInterface {
  name = 'UpdateSmsDumpster1710327211663';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_61a8461b18a7b910e965713cf3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" RENAME COLUMN "smsDumpsterStatus" TO "status"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."sms_dumpster_smsdumpsterstatus_enum" RENAME TO "sms_dumpster_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "haulerId"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "haulerId" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "hauler" DROP COLUMN "dumpsterSize"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."hauler_dumpstersize_enum"`,
    );
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
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "haulerId"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "haulerId" integer`);
    await queryRunner.query(
      `ALTER TYPE "public"."sms_dumpster_status_enum" RENAME TO "sms_dumpster_smsdumpsterstatus_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" RENAME COLUMN "status" TO "smsDumpsterStatus"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61a8461b18a7b910e965713cf3" ON "hauler" ("dumpsterSize") `,
    );
  }
}
