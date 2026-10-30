import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterReportSubscriptionTableAddWeeklyColumn1760350694336
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create frequency enum type
    await queryRunner.query(
      `CREATE TYPE report_frequency_enum AS ENUM ('monthly', 'weekly')`,
    );

    // 2. Add frequency column with default 'monthly'
    await queryRunner.addColumn(
      'report_subscriptions',
      new TableColumn({
        name: 'frequency',
        type: 'report_frequency_enum',
        default: "'monthly'",
        isNullable: false,
      }),
    );

    // 3. Backfill existing records with 'monthly'
    await queryRunner.query(
      `UPDATE report_subscriptions SET frequency = 'monthly' WHERE frequency IS NULL`,
    );

    // 4. Drop existing unique constraints
    await queryRunner.query(
      `ALTER TABLE report_subscriptions DROP CONSTRAINT IF EXISTS uq_user_report`,
    );
    await queryRunner.query(
      `ALTER TABLE report_subscriptions DROP CONSTRAINT IF EXISTS uq_user_report_jobsite`,
    );

    // 5. Create new unique constraint including frequency
    await queryRunner.query(
      `ALTER TABLE report_subscriptions 
       ADD CONSTRAINT uq_user_report_frequency 
       UNIQUE ("userId", "reportType", "jobSiteId", "frequency")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the new unique constraint
    await queryRunner.query(
      `ALTER TABLE report_subscriptions DROP CONSTRAINT IF EXISTS uq_user_report_frequency`,
    );

    // 2. Recreate old unique constraints
    await queryRunner.query(
      `ALTER TABLE report_subscriptions 
       ADD CONSTRAINT uq_user_report 
       UNIQUE ("userId", "reportType", "jobSiteId")`,
    );

    await queryRunner.query(
      `ALTER TABLE report_subscriptions 
       ADD CONSTRAINT uq_user_report_jobsite 
       UNIQUE ("userId", "reportType", "jobSiteId")`,
    );

    // 3. Drop frequency column
    await queryRunner.dropColumn('report_subscriptions', 'frequency');

    // 4. Drop frequency enum type
    await queryRunner.query(`DROP TYPE IF EXISTS report_frequency_enum`);
  }
}
