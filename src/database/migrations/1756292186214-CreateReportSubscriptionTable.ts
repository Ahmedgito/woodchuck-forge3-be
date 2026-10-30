import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateReportSubscriptionTable1756292186214
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type in Postgres
    await queryRunner.query(
      `CREATE TYPE report_type_enum AS ENUM ('dashboard', 'job_site')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'report_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
          },
          {
            name: 'reportType',
            type: 'report_type_enum',
          },
          {
            name: 'jobSiteId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'report_subscriptions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'report_subscriptions',
      new TableForeignKey({
        columnNames: ['jobSiteId'],
        referencedTableName: 'job_site',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'report_subscriptions',
      new TableUnique({
        name: 'uq_user_report',
        columnNames: ['userId', 'reportType', 'jobSiteId'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'report_subscriptions',
      new TableUnique({
        name: 'uq_user_report_jobsite',
        columnNames: ['userId', 'reportType', 'jobSiteId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('report_subscriptions');
  }
}
