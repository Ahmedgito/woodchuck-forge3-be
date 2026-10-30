import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSiteCamera1732099381407 implements MigrationInterface {
  name = 'JobSiteCamera1732099381407';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_site_cameras" 
      ("id" SERIAL NOT NULL, 
      "name" character varying NOT NULL, 
      "maxLevel" double precision NOT NULL, 
      "alertTo" integer NOT NULL, 
      "alertToType" integer NOT NULL, 
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
      "jobSiteId" integer, 
      "cameraId" integer, 
      CONSTRAINT "PK_de375d943947c46a0d9dd3ebfc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_cameras" ADD CONSTRAINT "FK_6622acd9919af52250529c76f74" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_cameras" ADD CONSTRAINT "FK_6622acd9919af52250529c76f75" FOREIGN KEY ("cameraId") REFERENCES "camera"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_site_cameras" DROP CONSTRAINT "FK_6622acd9919af52250529c76f74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_site_cameras" DROP CONSTRAINT "FK_6622acd9919af52250529c76f75"`,
    );
    await queryRunner.query(`DROP TABLE "job_site_cameras"`);
  }
}
