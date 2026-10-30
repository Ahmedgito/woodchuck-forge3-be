import { MigrationInterface, QueryRunner } from 'typeorm';

export class User1709104998968 implements MigrationInterface {
  name = 'User1709104998968';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_58e4dbff0e1a32a9bdc861bb29"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f0e1b4ecdca13b177e2e3a0613"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "firstName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "photoId"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "username" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "name" character varying`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "company" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "phone" character varying`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "billing_details_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "billing_details_street" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "billing_details_city" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "billing_details_state" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "billing_details_zipcode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "billing_details_country" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user" ("username") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_065d4d8f3b5adb4a08841eae3c" ON "user" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1deceaa2e6008b9a3241252c77" ON "user" ("company") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e1f623798118e629b46a9e629" ON "user" ("phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01df50b14ed70b22e10e1745a1" ON "user" ("billing_details_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb73022532677d690ce15d89dc" ON "user" ("billing_details_street") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb0ca59cb591d4bc5ccb9f9719" ON "user" ("billing_details_city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b88824e711910d6dd0e6f073fc" ON "user" ("billing_details_state") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9853344de95ec4cde233c38f9e" ON "user" ("billing_details_zipcode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_efc83613ac8aa8fdd2dd1c9bd5" ON "user" ("billing_details_country") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_efc83613ac8aa8fdd2dd1c9bd5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9853344de95ec4cde233c38f9e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b88824e711910d6dd0e6f073fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb0ca59cb591d4bc5ccb9f9719"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb73022532677d690ce15d89dc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01df50b14ed70b22e10e1745a1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e1f623798118e629b46a9e629"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1deceaa2e6008b9a3241252c77"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_065d4d8f3b5adb4a08841eae3c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78a916df40e02a9deb1c4b75ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "billing_details_country"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "billing_details_zipcode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "billing_details_state"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "billing_details_city"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "billing_details_street"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "billing_details_name"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "company"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "username"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "photoId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "lastName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "firstName" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f0e1b4ecdca13b177e2e3a0613" ON "user" ("lastName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_58e4dbff0e1a32a9bdc861bb29" ON "user" ("firstName") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f" FOREIGN KEY ("photoId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
