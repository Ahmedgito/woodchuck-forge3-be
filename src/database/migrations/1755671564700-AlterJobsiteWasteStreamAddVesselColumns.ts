import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AlterJobsiteWasteStreamAddVesselColumns1755671564700
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add vesselId column
    await queryRunner.addColumn(
      'jobsites_wastestreams',
      new TableColumn({
        name: 'vesselId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add vesselOptionId column
    await queryRunner.addColumn(
      'jobsites_wastestreams',
      new TableColumn({
        name: 'vesselOptionId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Foreign key for vesselId → vessels(id)
    await queryRunner.createForeignKey(
      'jobsites_wastestreams',
      new TableForeignKey({
        columnNames: ['vesselId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vessel',
        onDelete: 'SET NULL',
      }),
    );

    // Foreign key for vesselOptionId → vessel_options(id)
    await queryRunner.createForeignKey(
      'jobsites_wastestreams',
      new TableForeignKey({
        columnNames: ['vesselOptionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vessel_options',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('jobsites_wastestreams');
    if (table) {
      const vesselFk = table.foreignKeys.find((fk) =>
        fk.columnNames.includes('vesselId'),
      );
      if (vesselFk)
        await queryRunner.dropForeignKey('jobsites_wastestreams', vesselFk);

      const vesselOptionFk = table.foreignKeys.find((fk) =>
        fk.columnNames.includes('vesselOptionId'),
      );
      if (vesselOptionFk)
        await queryRunner.dropForeignKey(
          'jobsites_wastestreams',
          vesselOptionFk,
        );
    }

    // Drop columns
    await queryRunner.dropColumn('jobsites_wastestreams', 'vesselId');
    await queryRunner.dropColumn('jobsites_wastestreams', 'vesselOptionId');
  }
}
