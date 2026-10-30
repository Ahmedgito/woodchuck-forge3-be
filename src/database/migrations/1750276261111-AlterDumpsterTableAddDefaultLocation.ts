import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AlterDumpsterTableAddDefaultLocation1750276261111
  implements MigrationInterface
{
  name = 'AlterDumpsterTableAddDefaultLocation1750276261111';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the jobsite_sub_locations join table
    await queryRunner.createTable(
      new Table({
        name: 'jobsite_sub_locations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'jobSiteId',
            type: 'int',
          },
          {
            name: 'dumpsterId',
            type: 'int',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // 2. Add foreign keys
    await queryRunner.createForeignKey(
      'jobsite_sub_locations',
      new TableForeignKey({
        columnNames: ['jobSiteId'],
        referencedTableName: 'job_site',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'jobsite_sub_locations',
      new TableForeignKey({
        columnNames: ['dumpsterId'],
        referencedTableName: 'dumpster',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. Migrate data from dumpster to jobsite_sub_locations
    await queryRunner.query(`
          INSERT INTO jobsite_sub_locations ("jobSiteId", "dumpsterId", "createdAt", "updatedAt")
          SELECT "jobSiteId", "id", NOW(), NOW()
          FROM dumpster
          WHERE "jobSiteId" IS NOT NULL
        `);

    // 4. Drop jobSiteId column from dumpster
    await queryRunner.query(`ALTER TABLE "dumpster" DROP COLUMN "jobSiteId"`);

    // 5. Add isDefault column to dumpster
    await queryRunner.query(
      `ALTER TABLE "dumpster" ADD "isDefault" boolean DEFAULT false`,
    );

    // 6. Optionally insert a global default sub-location if not already present
    await queryRunner.query(`
          INSERT INTO "dumpster" ("sublocationName", "distanceToMmr", "unit", "isDefault", "createdAt", "updatedAt")
          SELECT 'On Jobsite', 0, 'miles', true, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM "dumpster" WHERE "sublocationName" = 'On Jobsite'
          )
        `);

    // 7. Associate every job site with the new default sub-location (assumes last insert is global default)
    const [{ id: defaultSublocationId }] = await queryRunner.query(`
      SELECT id FROM "dumpster" ORDER BY "createdAt" DESC LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO "jobsite_sub_locations" ("jobSiteId", "dumpsterId", "createdAt", "updatedAt")
      SELECT js.id, ${defaultSublocationId}, now(), now()
      FROM "job_site" js
      WHERE NOT EXISTS (
        SELECT 1 FROM "jobsite_sub_locations" jsl
        WHERE jsl."jobSiteId" = js.id AND jsl."dumpsterId" = ${defaultSublocationId}
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert isDefault column
    await queryRunner.query(`ALTER TABLE "dumpster" DROP COLUMN "isDefault"`);

    // Re-add jobSiteId column (nullable to avoid data issues)
    await queryRunner.query(`ALTER TABLE "dumpster" ADD "jobSiteId" int`);

    // Drop the jobsite_sub_locations table
    await queryRunner.dropTable('jobsite_sub_locations');
  }
}
