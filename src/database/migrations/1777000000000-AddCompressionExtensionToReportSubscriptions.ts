import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompressionExtensionToReportSubscriptions1777000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "report_subscriptions_compressionextension_enum" AS ENUM ('zip', 'piz')`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ADD "compressionExtension" "report_subscriptions_compressionextension_enum" NOT NULL DEFAULT 'zip'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" DROP COLUMN "compressionExtension"`,
    );
    await queryRunner.query(
      `DROP TYPE "report_subscriptions_compressionextension_enum"`,
    );
  }
}
