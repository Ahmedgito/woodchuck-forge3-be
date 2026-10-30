import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWasteStreamTypesTable1750072569020
  implements MigrationInterface
{
  name = 'CreateWasteStreamTypesTable1750072569020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "wastestream_types" (
            "id" SERIAL NOT NULL,
            "wasteStreamId" INTEGER NOT NULL,
            "name" VARCHAR NOT NULL,
            "colorCodeEst" character varying NOT NULL, 
            "colorCodeReal" character varying NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "deletedAt" TIMESTAMP,
            CONSTRAINT "PK_waste_subtypes_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_waste_subtypes_stream" FOREIGN KEY ("wasteStreamId") REFERENCES "wastestreams"("id") ON DELETE CASCADE
        )
    `);
    // Add a type for each waste stream with name 'Old'
    await queryRunner.query(`
      INSERT INTO "wastestream_types" ("wasteStreamId", "name", "colorCodeEst", "colorCodeReal")
      SELECT id, 'Old', "colorCodeEst", "colorCodeReal" FROM "wastestreams";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wastestream_types"`);
  }
}
