import { MigrationInterface, QueryRunner } from 'typeorm';

export class MapvesselData1755838457643 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1) Seed vessel and vessel_options (integer options) ---
    const dumpsterTypes: Record<string, number[]> = {
      frontload: [2, 4, 6, 8],
      rolloff: [10, 20, 30, 40],
      compactors: [30, 40],
    };

    const vesselIds: Record<string, number> = {};

    // upsert-like behavior (select first, insert if missing) for vessel
    for (const vesselName of Object.keys(dumpsterTypes)) {
      let rows: Array<{ id: number }> = await queryRunner.query(
        `SELECT "id" FROM "vessel" WHERE "name" = $1 LIMIT 1`,
        [vesselName],
      );

      if (rows.length === 0) {
        rows = await queryRunner.query(
          `INSERT INTO "vessel"("name","createdAt","updatedAt")
           VALUES ($1, NOW(), NOW())
           RETURNING "id"`,
          [vesselName],
        );
      }
      vesselIds[vesselName] = rows[0].id;

      // vessel options (value is integer)
      for (const val of dumpsterTypes[vesselName]) {
        const opt = await queryRunner.query(
          `SELECT "id" FROM "vessel_options"
           WHERE "vesselId" = $1 AND "value" = $2
           LIMIT 1`,
          [vesselIds[vesselName], val],
        );
        if (opt.length === 0) {
          await queryRunner.query(
            `INSERT INTO "vessel_options"("vesselId","value","createdAt","updatedAt")
             VALUES ($1, $2, NOW(), NOW())`,
            [vesselIds[vesselName], val],
          );
        }
      }
    }

    // --- 2) Associate every WasteStreamType with all vessel and BACKFILL TONS ---
    // Pull WasteStreamType joined with parent WasteStream to get ton columns in one go
    const wstRows: Array<{
      id: number;
      wasteStreamId: number;
      tonPerOffRoleYard: number | null;
      tonPerFrontLoadYard: number | null;
      tonPerCompactorYard: number | null;
    }> = await queryRunner.query(`
      SELECT
        wst."id" AS id,
        wst."wasteStreamId" AS "wasteStreamId",
        ws."tonPerOffRoleYard" AS "tonPerOffRoleYard",
        ws."tonPerFrontLoadYard" AS "tonPerFrontLoadYard",
        ws."tonPerCompactorYard" AS "tonPerCompactorYard"
      FROM "wastestream_types" wst
      JOIN "wastestreams" ws ON ws."id" = wst."wasteStreamId"
    `);

    for (const row of wstRows) {
      // For each vessel family, pick tons from the correct WasteStream column
      const tonsByFamily: Record<string, number> = {
        rolloff: Number(row.tonPerOffRoleYard ?? 0),
        frontload: Number(row.tonPerFrontLoadYard ?? 0),
        compactors: Number(row.tonPerCompactorYard ?? 0),
      };

      for (const vesselName of Object.keys(dumpsterTypes)) {
        const vesselId = vesselIds[vesselName];
        if (!vesselId) continue;

        const tons = tonsByFamily[vesselName] ?? 0;

        // Upsert into junction on composite key (wasteStreamTypeId, vesselId)
        await queryRunner.query(
          `INSERT INTO "wastestream_type_vessels"
            ("wasteStreamTypeId","vesselId","tons","createdAt","updatedAt")
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT ("wasteStreamTypeId","vesselId")
           DO UPDATE SET "tons" = EXCLUDED."tons", "updatedAt" = NOW()`,
          [row.id, vesselId, tons],
        );
      }
    }

    // --- 3) Update jobsites_wastestreams with vesselId and vesselOptionId from dumpster_type ---
    const jsRows: Array<{ id: number; dumpster_type: string | null }> =
      await queryRunner.query(
        `SELECT "id", "dumpster_type" FROM "jobsites_wastestreams"`,
      );

    for (const js of jsRows) {
      if (!js.dumpster_type) continue;

      // "frontload_2yd" => vesselKey="frontload", optionValue=2
      const [vesselKey, optionPartRaw] = js.dumpster_type.split('_');
      if (!vesselKey || !optionPartRaw) continue;

      const optionValue = Number((optionPartRaw || '').replace('yd', ''));
      if (Number.isNaN(optionValue)) continue;

      const vessel = await queryRunner.query(
        `SELECT "id" FROM "vessel" WHERE "name" = $1 LIMIT 1`,
        [vesselKey],
      );
      if (vessel.length === 0) continue;

      const vesselId = vessel[0].id;

      const option = await queryRunner.query(
        `SELECT "id" FROM "vessel_options"
         WHERE "vesselId" = $1 AND "value" = $2
         LIMIT 1`,
        [vesselId, optionValue],
      );
      const vesselOptionId = option[0]?.id ?? null;

      await queryRunner.query(
        `UPDATE "jobsites_wastestreams"
         SET "vesselId" = $1, "vesselOptionId" = $2
         WHERE "id" = $3`,
        [vesselId, vesselOptionId, js.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
