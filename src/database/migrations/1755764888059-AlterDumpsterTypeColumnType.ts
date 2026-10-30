import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterDumpsterTypeColumnType1755764888059
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the default constraint (if any)
    await queryRunner.query(`
      ALTER TABLE "jobsites_wastestreams" ALTER COLUMN "dumpster_type" DROP DEFAULT
    `);

    // Step 2: Change column to string (varchar)
    await queryRunner.query(`
        ALTER TABLE "jobsites_wastestreams"
        ALTER COLUMN "dumpster_type"
        TYPE varchar
        USING "dumpster_type"::text,
        ALTER COLUMN "dumpster_type" DROP NOT NULL
        `);

    // Step 3: Drop the enum type
    await queryRunner.query(`
          DROP TYPE IF EXISTS "jobsites_wastestreams_dumpster_type_enum"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Recreate enum type
    await queryRunner.query(
      `CREATE TYPE "public"."jobsites_wastestreams_dumpster_type_enum" AS ENUM('frontload_2yd','frontload_4yd','frontload_6yd','frontload_8yd','rolloff_10yd','rolloff_20yd','rolloff_30yd','rolloff_40yd','compactors_30yd','compactors_40yd')`,
    );

    // Step 2: Change column back to enum
    await queryRunner.query(`
      ALTER TABLE "jobsites_wastestreams"
      ALTER COLUMN "dumpster_type"
      TYPE "jobsites_wastestreams_dumpster_type_enum"
      USING "dumpster_type"::"jobsites_wastestreams_dumpster_type_enum",
      ALTER COLUMN "dumpster_type" SET NOT NULL
    `);
  }
}
