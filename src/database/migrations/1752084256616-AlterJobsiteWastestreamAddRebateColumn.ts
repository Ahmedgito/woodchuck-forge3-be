import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterJobsiteWastestreamAddRebateColumn1752084256616
  implements MigrationInterface
{
  name = 'AlterJobsiteWastestreamAddRebateColumn1752084256616';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // // Make distance column nullable
    await queryRunner.query(`
      ALTER TABLE "jobsites_wastestreams"
      ALTER COLUMN "distance" DROP NOT NULL;
    `);

    await queryRunner.addColumn(
      'jobsites_wastestreams',
      new TableColumn({
        name: 'recycling_rebate',
        type: 'numeric(10,2)',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'jobsites_wastestreams',
      new TableColumn({
        name: 'reports_enabled',
        type: 'boolean',
        default: 'false',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert recycling_rebate addition
    await queryRunner.dropColumn('jobsites_wastestreams', 'recycling_rebate');

    // Revert display_reports addition
    await queryRunner.dropColumn('jobsites_wastestreams', 'reports_enabled');

    // Revert distance to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "jobsites_wastestreams"
      ALTER COLUMN "distance" SET NOT NULL;
    `);
  }
}
