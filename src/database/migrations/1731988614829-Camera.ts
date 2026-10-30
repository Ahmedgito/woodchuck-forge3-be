import { MigrationInterface, QueryRunner } from 'typeorm';

export class Camera1731988614829 implements MigrationInterface {
  name = 'Camera1731988614829';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "camera" (
        "id" SERIAL NOT NULL, 
        "name" character varying NOT NULL, 
        "cameraId" character varying NOT NULL, 
        "macAddress" character varying NOT NULL, 
        "url" character varying NOT NULL, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_camera_id" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "camera"`);
  }
}
