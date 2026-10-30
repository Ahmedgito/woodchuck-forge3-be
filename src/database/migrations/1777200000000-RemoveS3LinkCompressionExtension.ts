import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveS3LinkCompressionExtension1777200000000
  implements MigrationInterface
{
  // Drops the 's3Link' value from the compression extension enum. Reports are
  // now always delivered via download links, so the only remaining archive
  // formats are 'zip' and 'piz'. Existing 's3Link' subscriptions are migrated
  // to 'zip' before the value is removed (a ZIP client still gets a download
  // link — just a single .zip link instead of the .zip + .piz pair a PIZ
  // client receives).
  //
  // Recreate the enum type instead of dropping a value in place, which
  // Postgres does not support.
  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
