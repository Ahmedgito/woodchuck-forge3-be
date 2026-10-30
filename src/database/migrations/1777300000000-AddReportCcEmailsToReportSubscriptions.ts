import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportCcEmailsToReportSubscriptions1777300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Addresses CC'd on the report emails produced by this subscription.
    // Empty array = nobody is CC'd, which is the behaviour for every existing
    // subscription.
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" ADD "reportCcEmails" json NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_subscriptions" DROP COLUMN "reportCcEmails"`,
    );
  }
}
