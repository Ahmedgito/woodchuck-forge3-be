import { MigrationInterface, QueryRunner } from 'typeorm';

export class DumpsterRefusedMmr1710227176882 implements MigrationInterface {
  name = 'DumpsterRefusedMmr1710227176882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dumpster_refused_mmr" ("id" SERIAL NOT NULL, "jobSiteId" integer, "dumpsterLocationId" integer, "dumspterSize" integer, "dumspterCount" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8fd53dd7b2aad42e2f676f497d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sms_dump" ("id" SERIAL NOT NULL, "sender" character varying, "receiver" character varying, "message" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ad02896773481fc8f23728c60e4" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sms_dump"`);
    await queryRunner.query(`DROP TABLE "dumpster_refused_mmr"`);
  }
}
