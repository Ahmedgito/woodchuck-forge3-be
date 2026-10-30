import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePowerPlantBtuPerTonDataType1716977719846
  implements MigrationInterface
{
  name = 'UpdatePowerPlantBtuPerTonDataType1716977719846';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP COLUMN "btuPerTon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD "btuPerTon" double precision NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP COLUMN "btuPerTon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD "btuPerTon" integer NOT NULL`,
    );
  }
}
