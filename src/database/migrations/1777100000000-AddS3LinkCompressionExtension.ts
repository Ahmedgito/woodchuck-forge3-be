import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddS3LinkCompressionExtension1777100000000
  implements MigrationInterface
{
  // Recreate the enum type instead of ALTER TYPE ... ADD VALUE, which cannot
  // run inside the transaction TypeORM wraps migrations in (PG < 12).
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "report_subscriptions_compressionextension_enum" RENAME TO "report_subscriptions_compressionextension_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "report_subscriptions_compressionextension_enum" AS ENUM ('zip', 'piz', 's3Link')`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ALTER COLUMN "compressionExtension" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ALTER COLUMN "compressionExtension" TYPE "report_subscriptions_compressionextension_enum" USING "compressionExtension"::text::"report_subscriptions_compressionextension_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ALTER COLUMN "compressionExtension" SET DEFAULT 'zip'`,
    );
    await queryRunner.query(
      `DROP TYPE "report_subscriptions_compressionextension_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "report_subscriptions" SET "compressionExtension" = 'zip' WHERE "compressionExtension" = 's3Link'`,
    );
    await queryRunner.query(
      `ALTER TYPE "report_subscriptions_compressionextension_enum" RENAME TO "report_subscriptions_compressionextension_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "report_subscriptions_compressionextension_enum" AS ENUM ('zip', 'piz')`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ALTER COLUMN "compressionExtension" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ALTER COLUMN "compressionExtension" TYPE "report_subscriptions_compressionextension_enum" USING "compressionExtension"::text::"report_subscriptions_compressionextension_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ALTER COLUMN "compressionExtension" SET DEFAULT 'zip'`,
    );
    await queryRunner.query(
      `DROP TYPE "report_subscriptions_compressionextension_enum_old"`,
    );
  }
}
