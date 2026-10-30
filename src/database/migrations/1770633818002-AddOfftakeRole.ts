import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfftakeRole1770633818002 implements MigrationInterface {
  name = 'AddOfftakeRole1770633818002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "role" ("id", "name") VALUES (7, 'Offtakes/Endpoints') ON CONFLICT ("id") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role" WHERE "id" = 7`);
  }
}
