import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateVesselTables1755251698480 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create vessel table
    await queryRunner.createTable(
      new Table({
        name: 'vessel',
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
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create vessel_options table
    await queryRunner.createTable(
      new Table({
        name: 'vessel_options',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'vesselId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for vessel_id
    await queryRunner.createForeignKey(
      'vessel_options',
      new TableForeignKey({
        columnNames: ['vesselId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vessel',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vessel_options');
    await queryRunner.dropTable('vessel');
  }
}
