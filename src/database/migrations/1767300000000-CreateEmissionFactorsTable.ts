import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmissionFactorsTable1767300000000
  implements MigrationInterface
{
  name = 'CreateEmissionFactorsTable1767300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'emission_factors',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'value',
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
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'emission_factors',
      new TableIndex({
        name: 'IDX_emission_factors_name',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'emission_factors',
      new TableIndex({
        name: 'IDX_emission_factors_key',
        columnNames: ['key'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'emission_factors',
      'IDX_emission_factors_key',
    );
    await queryRunner.dropIndex(
      'emission_factors',
      'IDX_emission_factors_name',
    );

    // Drop table
    await queryRunner.dropTable('emission_factors');
  }
}

