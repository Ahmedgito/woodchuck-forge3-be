import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalData1709135888629 implements MigrationInterface {
  name = 'GlobalData1709135888629';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "distanceMmrMacomb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "distanceMmrMacomb" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "distanceMmrLivonia"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "distanceMmrLivonia" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage10yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage10yrd" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage20yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage20yrd" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage30yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage30yrd" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage40yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage40yrd" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage40yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage40yrd" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage30yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage30yrd" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage20yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage20yrd" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "tonage10yrd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "tonage10yrd" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "distanceMmrLivonia"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "distanceMmrLivonia" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" DROP COLUMN "distanceMmrMacomb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_data" ADD "distanceMmrMacomb" integer`,
    );
  }
}
