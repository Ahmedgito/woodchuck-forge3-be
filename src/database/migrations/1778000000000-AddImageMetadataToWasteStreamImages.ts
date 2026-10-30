import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageMetadataToWasteStreamImages1778000000000
  implements MigrationInterface
{
  name = 'AddImageMetadataToWasteStreamImages1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" ADD "capturedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" ADD "latitude" numeric(10,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" ADD "longitude" numeric(11,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" ADD "metadataSource" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" ADD "distanceFromJobSiteMeters" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" ADD "locationVerified" boolean`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" DROP COLUMN "locationVerified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" DROP COLUMN "distanceFromJobSiteMeters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" DROP COLUMN "metadataSource"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" DROP COLUMN "longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" DROP COLUMN "latitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waste_stream_images" DROP COLUMN "capturedAt"`,
    );
  }
}
