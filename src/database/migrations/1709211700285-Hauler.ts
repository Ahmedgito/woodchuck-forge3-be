import { MigrationInterface, QueryRunner } from 'typeorm';

export class Hauler1709211700285 implements MigrationInterface {
  name = 'Hauler1709211700285';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "haulerType" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "unit" character varying NOT NULL, CONSTRAINT "PK_03009c27ae2d94f546b20acc349" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."hauler_dumpstersize_enum" AS ENUM('10', '20', '30', '40')`,
    );
    await queryRunner.query(
      `CREATE TABLE "hauler" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "dumpsterSize" "public"."hauler_dumpstersize_enum" NOT NULL DEFAULT '10', "phone" character varying NOT NULL, "email" character varying NOT NULL, "address" character varying NOT NULL, "street" character varying NOT NULL, "city" character varying NOT NULL, "state" character varying NOT NULL, "zip" character varying NOT NULL, "country" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "haulerTypeId" integer, CONSTRAINT "REL_46d1a262ad5216e2a0576450da" UNIQUE ("haulerTypeId"), CONSTRAINT "PK_ab4a0ec866fd883b5435a96e24d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5bd0e2b21af97abb7e43687c30" ON "hauler" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_46d1a262ad5216e2a0576450da" ON "hauler" ("haulerTypeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61a8461b18a7b910e965713cf3" ON "hauler" ("dumpsterSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81a57806c58977956f6deb99b9" ON "hauler" ("phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8ef8d642de1e5baa82815c340" ON "hauler" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8b08b66251c048b1f654b2032" ON "hauler" ("address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0422b494def62571b21c37a940" ON "hauler" ("street") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2fd3fe5eb5da4ee29a9c9d22c1" ON "hauler" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b0e5d36b68bcfcbe560f3c5fd8" ON "hauler" ("state") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f631e9a9292655db75ebb4cc1e" ON "hauler" ("zip") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82469cd83f24dead02de96b8e2" ON "hauler" ("country") `,
    );
    await queryRunner.query(
      `ALTER TABLE "hauler" ADD CONSTRAINT "FK_46d1a262ad5216e2a0576450da8" FOREIGN KEY ("haulerTypeId") REFERENCES "haulerType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hauler" DROP CONSTRAINT "FK_46d1a262ad5216e2a0576450da8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82469cd83f24dead02de96b8e2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f631e9a9292655db75ebb4cc1e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0e5d36b68bcfcbe560f3c5fd8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2fd3fe5eb5da4ee29a9c9d22c1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0422b494def62571b21c37a940"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8b08b66251c048b1f654b2032"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8ef8d642de1e5baa82815c340"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_81a57806c58977956f6deb99b9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61a8461b18a7b910e965713cf3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_46d1a262ad5216e2a0576450da"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5bd0e2b21af97abb7e43687c30"`,
    );
    await queryRunner.query(`DROP TABLE "hauler"`);
    await queryRunner.query(`DROP TYPE "public"."hauler_dumpstersize_enum"`);
    await queryRunner.query(`DROP TABLE "haulerType"`);
  }
}
