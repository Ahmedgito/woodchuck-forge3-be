import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPowerPlantsAddMwhPerTonColumn1767200000000
  implements MigrationInterface
{
  name = 'AlterPowerPlantsAddMwhPerTonColumn1767200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('power_plants');
    const kwhPerTonColumn = table?.findColumnByName('kwhPerTon');

    if (!kwhPerTonColumn) {
      await queryRunner.query(
        `ALTER TABLE "power_plants" ADD "kwhPerTon" double precision DEFAULT '1.0'`,
      );
    }

    // Create index for the column
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_power_plants_kwhPerTon" ON "power_plants" ("kwhPerTon")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_power_plants_kwhPerTon"`,
    );

    await queryRunner.query(`DROP COLUMN "kwhPerTon"`);
  }
}
