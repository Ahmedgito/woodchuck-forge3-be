import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGenieTable1762405000000
  implements MigrationInterface
{
  name = 'CreateGenieTable1762405000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'genie',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'value',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
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
      true,
    );

    await queryRunner.createIndex(
      'genie',
      new TableIndex({
        name: 'IDX_genie_value',
        columnNames: ['value'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('genie', 'IDX_genie_value');
    await queryRunner.dropTable('genie');
  }
}
