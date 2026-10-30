import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddAddressRelations1765796874534 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // job_site.addressId → address.id
    const jobSiteTable = await queryRunner.getTable('job_site');
    if (
      jobSiteTable &&
      !jobSiteTable.columns.find((c) => c.name === 'addressId')
    ) {
      await queryRunner.addColumn(
        'job_site',
        new TableColumn({
          name: 'addressId',
          type: 'int',
          isNullable: true,
        }),
      );

      await queryRunner.createForeignKey(
        'job_site',
        new TableForeignKey({
          name: 'FK_job_site_address',
          columnNames: ['addressId'],
          referencedTableName: 'address',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    // locations.addressId → address.id
    const locationsTable = await queryRunner.getTable('locations');
    if (
      locationsTable &&
      !locationsTable.columns.find((c) => c.name === 'addressId')
    ) {
      await queryRunner.addColumn(
        'locations',
        new TableColumn({
          name: 'addressId',
          type: 'int',
          isNullable: true,
        }),
      );

      await queryRunner.createForeignKey(
        'locations',
        new TableForeignKey({
          name: 'FK_locations_address',
          columnNames: ['addressId'],
          referencedTableName: 'address',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    // power_plants.addressId → address.id
    const powerPlantsTable = await queryRunner.getTable('power_plants');
    if (
      powerPlantsTable &&
      !powerPlantsTable.columns.find((c) => c.name === 'addressId')
    ) {
      await queryRunner.addColumn(
        'power_plants',
        new TableColumn({
          name: 'addressId',
          type: 'int',
          isNullable: true,
        }),
      );

      await queryRunner.createForeignKey(
        'power_plants',
        new TableForeignKey({
          name: 'FK_power_plants_address',
          columnNames: ['addressId'],
          referencedTableName: 'address',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // job_site
    const jobSiteTable = await queryRunner.getTable('job_site');
    if (jobSiteTable) {
      const fk = jobSiteTable.foreignKeys.find(
        (f) => f.name === 'FK_job_site_address',
      );
      if (fk) {
        await queryRunner.dropForeignKey('job_site', fk);
      }
      const col = jobSiteTable.columns.find((c) => c.name === 'addressId');
      if (col) {
        await queryRunner.dropColumn('job_site', col);
      }
    }

    // locations
    const locationsTable = await queryRunner.getTable('locations');
    if (locationsTable) {
      const fk = locationsTable.foreignKeys.find(
        (f) => f.name === 'FK_locations_address',
      );
      if (fk) {
        await queryRunner.dropForeignKey('locations', fk);
      }
      const col = locationsTable.columns.find((c) => c.name === 'addressId');
      if (col) {
        await queryRunner.dropColumn('locations', col);
      }
    }

    // power_plants
    const powerPlantsTable = await queryRunner.getTable('power_plants');
    if (powerPlantsTable) {
      const fk = powerPlantsTable.foreignKeys.find(
        (f) => f.name === 'FK_power_plants_address',
      );
      if (fk) {
        await queryRunner.dropForeignKey('power_plants', fk);
      }
      const col = powerPlantsTable.columns.find((c) => c.name === 'addressId');
      if (col) {
        await queryRunner.dropColumn('power_plants', col);
      }
    }
  }
}
