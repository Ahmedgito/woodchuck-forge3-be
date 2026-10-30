import { MigrationInterface, QueryRunner } from 'typeorm';

export class CameraLiveView1732075145229 implements MigrationInterface {
  name = 'CameraLiveView1732075145229';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "camera_live_view" ("id" SERIAL NOT NULL, "s3ImageUrl" character varying NOT NULL, "fillPercentage" double precision NOT NULL, "cameraId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de375d943947c46a0d9dd3ebfc3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "camera_live_view"`);
  }
}
