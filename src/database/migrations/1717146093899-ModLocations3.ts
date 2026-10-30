import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModLocations31717146093899 implements MigrationInterface {
  name = 'ModLocations31717146093899';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_d5edf29d306fc669783107ce9c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_8062d93a2c8bef68e4c4f191bb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN "relatedLocationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP COLUMN "relatedPowerPlantId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" ADD "relatedPowerPlantId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD "relatedLocationId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "FK_8062d93a2c8bef68e4c4f191bb3" FOREIGN KEY ("relatedLocationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "FK_d5edf29d306fc669783107ce9c1" FOREIGN KEY ("relatedPowerPlantId") REFERENCES "power_plants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
