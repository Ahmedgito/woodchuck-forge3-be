import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotification1710409543646 implements MigrationInterface {
  name = 'CreateNotification1710409543646';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "title" character varying, "message" character varying, "data" json, "isRead" boolean NOT NULL DEFAULT 'false', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
