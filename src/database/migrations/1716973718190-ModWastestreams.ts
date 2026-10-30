import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModWastestreams1716973718190 implements MigrationInterface {
  name = 'ModWastestreams1716973718190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wastestreams" DROP COLUMN "tonPerOffRoleYard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ADD "tonPerOffRoleYard" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" DROP COLUMN "tonPerFrontLoadYard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ADD "tonPerFrontLoadYard" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" DROP COLUMN "tonPerCompactorYard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ADD "tonPerCompactorYard" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ALTER COLUMN "colorCodeEst" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ALTER COLUMN "colorCodeReal" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ALTER COLUMN "colorCodeReal" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ALTER COLUMN "colorCodeEst" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" DROP COLUMN "tonPerCompactorYard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ADD "tonPerCompactorYard" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" DROP COLUMN "tonPerFrontLoadYard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ADD "tonPerFrontLoadYard" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" DROP COLUMN "tonPerOffRoleYard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wastestreams" ADD "tonPerOffRoleYard" integer NOT NULL`,
    );
  }
}
