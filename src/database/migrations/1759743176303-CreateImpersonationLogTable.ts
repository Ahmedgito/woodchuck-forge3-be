import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateImpersonationLogTable1759743176303
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'impersonation_log',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'superAdminId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'targetUserId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'endedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'impersonation_log',
      new TableForeignKey({
        columnNames: ['superAdminId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'impersonation_log',
      new TableForeignKey({
        columnNames: ['targetUserId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('impersonation_log');
    if (table) {
      const superFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('superAdminId') !== -1,
      );
      if (superFk)
        await queryRunner.dropForeignKey('impersonation_log', superFk);
      const targetFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('targetUserId') !== -1,
      );
      if (targetFk)
        await queryRunner.dropForeignKey('impersonation_log', targetFk);
    }
    await queryRunner.dropTable('impersonation_log');
  }
}
