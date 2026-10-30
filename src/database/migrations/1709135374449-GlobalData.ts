import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalData1709135374449 implements MigrationInterface {
  name = 'GlobalData1709135374449';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "global_data" ("id" SERIAL NOT NULL, "distanceMmrMacomb" integer, "distanceMmrLivonia" integer, "tonage10yrd" integer, "tonage20yrd" integer, "tonage30yrd" integer, "tonage40yrd" integer, "supervisorOnboarding" character varying, "autoResponse" character varying, CONSTRAINT "PK_87f0f2724da8df50933d7ca57e0" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "global_data"`);
  }
}
