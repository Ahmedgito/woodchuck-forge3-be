import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterReportSubscriptionAddFormat1761285565002
  implements MigrationInterface
{
  name = 'AlterReportSubscriptionAddFormat1761285565002';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new formats column as JSON with default value
    await queryRunner.addColumn(
      'report_subscriptions',
      new TableColumn({
        name: 'formats',
        type: 'json',
        default: '\'["pdf"]\'',
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('report_subscriptions', 'formats');
  }
}
