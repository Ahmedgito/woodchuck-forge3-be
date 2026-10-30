import { MigrationInterface, QueryRunner } from 'typeorm';

export class DumpsterStatus1710247709854 implements MigrationInterface {
  name = 'DumpsterStatus1710247709854';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dumpster_status" ("id" SERIAL NOT NULL, "jobSiteId" integer, "dumpsterLocationId" integer, "dumspterSize" integer, "miles" integer, "waste" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9427d50367875a5934ca228debc" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dumpster_status"`);
  }
}
