import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterJobSiteWasteStreamAddOrder1750818951809
  implements MigrationInterface
{
  name = 'AlterJobSiteWasteStreamAddOrder1750818951809';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'jobsites_wastestreams',
      new TableColumn({
        name: 'order',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('jobsites_wastestreams', 'order');
  }
}
