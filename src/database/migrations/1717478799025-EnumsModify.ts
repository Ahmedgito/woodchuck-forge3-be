import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnumsModify1717478799025 implements MigrationInterface {
  name = 'EnumsModify1717478799025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."locations_type_enum" RENAME TO "locations_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum" AS ENUM('1', '2', '3', '4', '5')`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" TYPE "public"."locations_type_enum" USING "type"::"text"::"public"."locations_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" SET DEFAULT '3'`,
    );
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."locations_totype_enum" RENAME TO "locations_totype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_totype_enum" AS ENUM('1', '2')`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" TYPE "public"."locations_totype_enum" USING "toType"::"text"::"public"."locations_totype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" SET DEFAULT '2'`,
    );
    await queryRunner.query(`DROP TYPE "public"."locations_totype_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" SET DEFAULT '2'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_totype_enum_old" AS ENUM('0', '1')`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "toType" TYPE "public"."locations_totype_enum_old" USING "toType"::"text"::"public"."locations_totype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."locations_totype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."locations_totype_enum_old" RENAME TO "locations_totype_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum_old" AS ENUM('0', '1', '2', '3', '4')`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" TYPE "public"."locations_type_enum_old" USING "type"::"text"::"public"."locations_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" SET DEFAULT '2'`,
    );
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."locations_type_enum_old" RENAME TO "locations_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT false`,
    );
  }
}
