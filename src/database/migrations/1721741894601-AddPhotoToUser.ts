import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhotoToUser1721741894601 implements MigrationInterface {
  name = 'AddPhotoToUser1721741894601';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "photo" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "photo"`);
  }
}
