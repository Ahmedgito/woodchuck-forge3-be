import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateCarbonCreditAndApiOnlyFlag1771200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isApiOnly flag to user table
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'isApiOnly',
        type: 'boolean',
        default: false,
      }),
    );

    // Create carbon_credit table
    await queryRunner.createTable(
      new Table({
        name: 'carbon_credit',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'jobSiteId',
            type: 'int',
          },
          {
            name: 'co2Value',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'carbonCreditDollars',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'estimated'",
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
      'carbon_credit',
      new TableForeignKey({
        columnNames: ['jobSiteId'],
        referencedTableName: 'job_site',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'carbon_credit',
      new TableUnique({
        name: 'uq_carbon_credit_jobsite',
        columnNames: ['jobSiteId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('carbon_credit');
    await queryRunner.dropColumn('user', 'isApiOnly');
  }
}
