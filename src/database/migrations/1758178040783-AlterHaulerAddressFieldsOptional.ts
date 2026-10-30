import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterHaulerAddressFieldsOptional1758178040783
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'hauler',
      'city',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'state',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'zip',
      new TableColumn({
        name: 'zip',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'street',
      new TableColumn({
        name: 'street',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'country',
      new TableColumn({
        name: 'country',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'hauler',
      'city',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'state',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'zip',
      new TableColumn({
        name: 'zip',
        type: 'varchar',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'street',
      new TableColumn({
        name: 'street',
        type: 'varchar',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'hauler',
      'country',
      new TableColumn({
        name: 'country',
        type: 'varchar',
        isNullable: false,
      }),
    );
  }
}
