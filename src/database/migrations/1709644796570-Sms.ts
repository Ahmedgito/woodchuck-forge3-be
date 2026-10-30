import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sms1709644796570 implements MigrationInterface {
  name = 'Sms1709644796570';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sms_dumpster_smsdumpsterstatus_enum" AS ENUM('request', 'stop', 'accept', 'reject')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sms_dumpster" ("id" SERIAL NOT NULL, "smsDumpsterStatus" "public"."sms_dumpster_smsdumpsterstatus_enum" NOT NULL DEFAULT 'request', "details" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "smsId" integer, "jobSiteId" integer, "dumpsterId" integer, CONSTRAINT "PK_e0dcc795d1bda65acfdb45d0ae8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sms" ("id" SERIAL NOT NULL, "orignalSms" text NOT NULL, "orignalResp" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "jobSiteId" integer, CONSTRAINT "PK_60793c2f16aafe0513f8817eae8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_22d6072792b02b7e4a347e9401f" FOREIGN KEY ("smsId") REFERENCES "sms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_9f77ccdb4b87cb80c326fd22a22" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_7ec7761a5aa93e83a8d3d502b68" FOREIGN KEY ("dumpsterId") REFERENCES "dumpster"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms" ADD CONSTRAINT "FK_ea2963cb72b97f96ba7b6859bbf" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sms" DROP CONSTRAINT "FK_ea2963cb72b97f96ba7b6859bbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" DROP CONSTRAINT "FK_7ec7761a5aa93e83a8d3d502b68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" DROP CONSTRAINT "FK_9f77ccdb4b87cb80c326fd22a22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" DROP CONSTRAINT "FK_22d6072792b02b7e4a347e9401f"`,
    );
    await queryRunner.query(`DROP TABLE "sms"`);
    await queryRunner.query(`DROP TABLE "sms_dumpster"`);
    await queryRunner.query(
      `DROP TYPE "public"."sms_dumpster_smsdumpsterstatus_enum"`,
    );
  }
}
