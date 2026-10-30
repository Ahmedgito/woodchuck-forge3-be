import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModLocations1717135479741 implements MigrationInterface {
  name = 'ModLocations1717135479741';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "locations"`);
    await queryRunner.query(
      `ALTER TABLE "dumpster_refused_mmr" DROP CONSTRAINT "FK_89ff97a5a47d4f4f9c969fca39c"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum" AS ENUM('0', '1', '2', '3', '4')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_totype_enum" AS ENUM('0', '1')`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "type" "public"."locations_type_enum" NOT NULL DEFAULT '2', "inMiles" double precision, "to" integer, "toType" "public"."locations_totype_enum", "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "haulerId"`);
    await queryRunner.query(`ALTER TABLE "job_site" ADD "haulerId" integer`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP COLUMN "btuPerTon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD "btuPerTon" double precision`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e179885785f3150c9f04828ea" ON "power_plants" ("btuPerTon") `,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_refused_mmr" ADD CONSTRAINT "FK_89ff97a5a47d4f4f9c969fca39c" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" ADD CONSTRAINT "FK_a15aed4bf00b12ac50f245aa337" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "locations" FOREIGN KEY ("to") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "powerplant" FOREIGN KEY ("to") REFERENCES "power_plants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "powerplant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "locations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_status" DROP CONSTRAINT "FK_a15aed4bf00b12ac50f245aa337"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_refused_mmr" DROP CONSTRAINT "FK_89ff97a5a47d4f4f9c969fca39c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e179885785f3150c9f04828ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" DROP COLUMN "btuPerTon"`,
    );
    await queryRunner.query(
      `ALTER TABLE "power_plants" ADD "btuPerTon" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "job_site" DROP COLUMN "haulerId"`);
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD "haulerId" character varying`,
    );
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TYPE "public"."locations_totype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "dumpster_refused_mmr" ADD CONSTRAINT "FK_89ff97a5a47d4f4f9c969fca39c" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
