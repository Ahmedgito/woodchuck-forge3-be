import { MigrationInterface, QueryRunner } from 'typeorm';

export class PowerPlants1716886612407 implements MigrationInterface {
  name = 'PowerPlants1716886612407';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "power_plants" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "btuPerTon" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_bfc0f42209f95b87073e0e02ac9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3144a9d18ceec6e258eb2523a2" ON "power_plants" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e179885785f3150c9f04828ea" ON "power_plants" ("btuPerTon") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "power_plants"`);
  }
}
