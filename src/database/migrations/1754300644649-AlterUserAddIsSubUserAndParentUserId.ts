import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AlterUserAddIsSubUserAndParentUserId1754300644649
  implements MigrationInterface
{
  name = 'AlterUserAddIsSubUserAndParentUserId1754300644649';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isSubUser column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'isSubUser',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    // Add parentUserId column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'parentUserId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add foreign key constraint for parentUserId
    await queryRunner.createForeignKey(
      'user',
      new TableForeignKey({
        columnNames: ['parentUserId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('user');
    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('parentUserId'),
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('user', foreignKey);
    }

    // Drop columns
    await queryRunner.dropColumn('user', 'parentUserId');
    await queryRunner.dropColumn('user', 'isSubUser');
  }
}
