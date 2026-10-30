import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWasteStreams1716898446020 implements MigrationInterface {
  name = 'CreateWasteStreams1716898446020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wastestreams" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "tonPerOffRoleYard" integer NOT NULL, "tonPerFrontLoadYard" integer NOT NULL, "tonPerCompactorYard" integer NOT NULL, "colorCodeEst" character varying NOT NULL, "colorCodeReal" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_635c9057d38030d73a2dd1ade4e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6b9f6fb821448c6475f4ba13bc" ON "wastestreams" ("name") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6b9f6fb821448c6475f4ba13bc"`,
    );
    await queryRunner.query(`DROP TABLE "wastestreams"`);
  }
}
