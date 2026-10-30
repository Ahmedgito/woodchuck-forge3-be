import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModDb1713523698274 implements MigrationInterface {
  name = 'ModDb1713523698274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" DROP CONSTRAINT "FK_9f77ccdb4b87cb80c326fd22a22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" DROP CONSTRAINT "FK_7ec7761a5aa93e83a8d3d502b68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" DROP CONSTRAINT "FK_22d6072792b02b7e4a347e9401f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster" DROP CONSTRAINT "FK_e4f9493a43c01d04c1bead21c0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms" DROP CONSTRAINT "FK_ea2963cb72b97f96ba7b6859bbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_22d6072792b02b7e4a347e9401f" FOREIGN KEY ("smsId") REFERENCES "sms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_9f77ccdb4b87cb80c326fd22a22" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_7ec7761a5aa93e83a8d3d502b68" FOREIGN KEY ("dumpsterId") REFERENCES "dumpster"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster" ADD CONSTRAINT "FK_e4f9493a43c01d04c1bead21c0f" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms" ADD CONSTRAINT "FK_ea2963cb72b97f96ba7b6859bbf" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sms" DROP CONSTRAINT "FK_ea2963cb72b97f96ba7b6859bbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster" DROP CONSTRAINT "FK_e4f9493a43c01d04c1bead21c0f"`,
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
    await queryRunner.query(
      `ALTER TABLE "sms" ADD CONSTRAINT "FK_ea2963cb72b97f96ba7b6859bbf" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster" ADD CONSTRAINT "FK_e4f9493a43c01d04c1bead21c0f" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_22d6072792b02b7e4a347e9401f" FOREIGN KEY ("smsId") REFERENCES "sms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_7ec7761a5aa93e83a8d3d502b68" FOREIGN KEY ("dumpsterId") REFERENCES "dumpster"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sms_dumpster" ADD CONSTRAINT "FK_9f77ccdb4b87cb80c326fd22a22" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
