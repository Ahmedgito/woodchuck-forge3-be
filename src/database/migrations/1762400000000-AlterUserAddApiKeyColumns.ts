import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterUserAddApiKeyColumns1762400000000
  implements MigrationInterface
{
  name = 'AlterUserAddApiKeyColumns1762400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'api_key_hash',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'api_key_encrypted',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'api_key_created_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'api_key_revoked',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'api_key_revoked');
    await queryRunner.dropColumn('user', 'api_key_created_at');
    await queryRunner.dropColumn('user', 'api_key_encrypted');
    await queryRunner.dropColumn('user', 'api_key_hash');
  }
}
