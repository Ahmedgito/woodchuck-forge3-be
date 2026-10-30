import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableUnique,
} from 'typeorm';

export class CreateWasteStreamActivityMappingTable1770633818001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'waste_stream_activity_mapping',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'wasteStreamName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'activity',
            type: 'varchar',
            length: '255',
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

    await queryRunner.createUniqueConstraint(
      'waste_stream_activity_mapping',
      new TableUnique({
        name: 'uq_waste_stream_activity_mapping_name',
        columnNames: ['wasteStreamName'],
      }),
    );

    // Insert default mappings
    await queryRunner.query(`
      INSERT INTO waste_stream_activity_mapping ("wasteStreamName", "activity", "createdAt", "updatedAt")
      VALUES
        ('WOOD WASTE', 'Biomass', NOW(), NOW()),
        ('METAL', 'Recycled', NOW(), NOW()),
        ('PLASTIC', 'Recycled', NOW(), NOW()),
        ('CONCRETE', 'Recycled', NOW(), NOW()),
        ('WASTE HAULING + LANDFILL', 'Non-Recycled', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('waste_stream_activity_mapping');
  }
}
