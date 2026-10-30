import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSite1709023050668 implements MigrationInterface {
  name = 'JobSite1709023050668';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_site" ("id" SERIAL NOT NULL, "street" character varying, "city" character varying, "state" character varying, "zipcode" character varying, "name" character varying, "phone" character varying, "email" character varying, "sizeSqft" integer, "completedAt" date, "clientId" integer, "haulerId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "closedAt" date, "statusId" integer, CONSTRAINT "PK_fec9499acd961963befccb3a17c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site" ADD CONSTRAINT "FK_7bc58fbf018d86bd0eb5d4467e1" FOREIGN KEY ("statusId") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site" DROP CONSTRAINT "FK_7bc58fbf018d86bd0eb5d4467e1"`,
    );
    await queryRunner.query(`DROP TABLE "job_site"`);
  }
}
