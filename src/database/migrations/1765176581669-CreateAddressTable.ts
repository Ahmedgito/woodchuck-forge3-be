import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAddressTable1765176581669 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'address',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'addressFull',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'addressLine1',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'addressLine2',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'state',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'postalCode',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'lat',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'lng',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'placeId',
            type: 'varchar',
            isNullable: true,
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

    // Create indexes on lat and lng
    await queryRunner.createIndex(
      'address',
      new TableIndex({
        name: 'IDX_address_lat',
        columnNames: ['lat'],
      }),
    );

    await queryRunner.createIndex(
      'address',
      new TableIndex({
        name: 'IDX_address_lng',
        columnNames: ['lng'],
      }),
    );

    // Note: relationships to job sites, locations, and power plants are handled
    // via addressId columns on those tables, not foreign keys from address.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('address');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('address', fk);
      }
    }

    await queryRunner.dropIndex('address', 'IDX_address_lng');
    await queryRunner.dropIndex('address', 'IDX_address_lat');
    await queryRunner.dropTable('address');
    await queryRunner.query(`DROP TYPE IF EXISTS address_type_enum`);
  }
}
