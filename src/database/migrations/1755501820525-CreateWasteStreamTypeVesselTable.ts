import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateWasteStreamTypeVesselTable1755501820525
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wastestream_type_vessels',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'wasteStreamTypeId', type: 'int', isPrimary: true },
          { name: 'vesselId', type: 'int', isPrimary: true },
          {
            name: 'tons',
            type: 'double precision',
            isNullable: false,
            default: 0,
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
      'wastestream_type_vessels',
      new TableForeignKey({
        columnNames: ['wasteStreamTypeId'],
        referencedTableName: 'wastestream_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'wastestream_type_vessels',
      new TableForeignKey({
        columnNames: ['vesselId'],
        referencedTableName: 'vessel',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'wastestream_type_vessels',
      new TableUnique({
        name: 'uq_wst_vessel',
        columnNames: ['wasteStreamTypeId', 'vesselId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wastestream_type_vessels');
  }
}
