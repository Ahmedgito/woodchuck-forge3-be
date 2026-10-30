import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWasteStreamCamerasTable1750133323929
  implements MigrationInterface
{
  name = 'CreateWasteStreamCamerasTable1750133323929';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "wastestream_cameras" (
            "id" SERIAL NOT NULL,
            "jobsiteWasteStreamId" INTEGER NOT NULL,
            "cameraId" INTEGER NOT NULL,
            "additionalCameraId" INTEGER,
            "maxLevel" double precision NOT NULL,
            "confidenceLevel" double precision NOT NULL,
            "alertTo" INTEGER NOT NULL,
            "alertToType" INTEGER NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_waste_stream_cameras_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_wsc_jws" FOREIGN KEY ("jobsiteWasteStreamId") REFERENCES "jobsites_wastestreams"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_wsc_camera" FOREIGN KEY ("cameraId") REFERENCES "camera"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_wsc_camera_1" FOREIGN KEY ("additionalCameraId") REFERENCES "camera"("id")
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wastestream_cameras"`);
  }
}
