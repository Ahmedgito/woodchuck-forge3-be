import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPowerplantInJsWs1721978042823 implements MigrationInterface {
  name = 'AddPowerplantInJsWs1721978042823';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD "powerplantId" integer`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_site" DROP CONSTRAINT "FK_7bc58fbf018d86bd0eb5d4467e1"`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_eb42805a560431bd175f5c3334" ON "jobsites_wastestreams" ("powerplantId") `,
    );

    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" ADD CONSTRAINT "FK_eb42805a560431bd175f5c33348" FOREIGN KEY ("powerplantId") REFERENCES "power_plants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP CONSTRAINT "FK_eb42805a560431bd175f5c33348"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP CONSTRAINT "FK_7bc58fbf018d86bd0eb5d4467e1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eb42805a560431bd175f5c3334"`,
    );

    await queryRunner.query(
      `ALTER TABLE "jobsites_wastestreams" DROP COLUMN "powerplantId"`,
    );
  }
}
