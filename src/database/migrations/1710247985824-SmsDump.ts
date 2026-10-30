import { MigrationInterface, QueryRunner } from 'typeorm';

export class SmsDump1710247985824 implements MigrationInterface {
  name = 'SmsDump1710247985824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_dump" DROP COLUMN "message"`);
    await queryRunner.query(`ALTER TABLE "sms_dump" ADD "message" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_dump" DROP COLUMN "message"`);
    await queryRunner.query(
      `ALTER TABLE "sms_dump" ADD "message" character varying`,
    );
  }
}
