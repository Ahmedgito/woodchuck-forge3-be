import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateHauler1709540988576 implements MigrationInterface {
  name = 'UpdateHauler1709540988576';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8b08b66251c048b1f654b2032"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0422b494def62571b21c37a940"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2fd3fe5eb5da4ee29a9c9d22c1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0e5d36b68bcfcbe560f3c5fd8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f631e9a9292655db75ebb4cc1e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82469cd83f24dead02de96b8e2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hauler" ALTER COLUMN "address" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hauler" ALTER COLUMN "address" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82469cd83f24dead02de96b8e2" ON "hauler" ("country") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f631e9a9292655db75ebb4cc1e" ON "hauler" ("zip") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b0e5d36b68bcfcbe560f3c5fd8" ON "hauler" ("state") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2fd3fe5eb5da4ee29a9c9d22c1" ON "hauler" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0422b494def62571b21c37a940" ON "hauler" ("street") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8b08b66251c048b1f654b2032" ON "hauler" ("address") `,
    );
  }
}
