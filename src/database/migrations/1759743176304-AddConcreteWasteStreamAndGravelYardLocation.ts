import { MigrationInterface, QueryRunner } from 'typeorm';
import { WasteStreamsEntity } from '../../wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { LocationsEntity } from '../../locations/infrastructure/persistence/relational/entities/locations.entity';
import { WasteStreamTypesEntity } from '../../wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { VesselEntity } from '../../vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { WasteStreamTypeVesselsEntity } from '../../wastestream-type-vessels/infrastructure/persistence/relational/entities/wastestream-type-vessels.entity';

export class AddConcreteWasteStreamAndGravelYardLocation1759743176304
  implements MigrationInterface
{
  name = 'AddConcreteWasteStreamAndGravelYardLocation1759743176304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add 'Gravel Yard' to LocationsTypeEnum
    await queryRunner.query(
      `ALTER TYPE "public"."locations_type_enum" RENAME TO "locations_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum" AS ENUM('1', '2', '3', '4', '5', '6')`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" TYPE "public"."locations_type_enum" USING "type"::"text"::"public"."locations_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" SET DEFAULT '3'`,
    );
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum_old"`);

    // 2. Add 'Concrete' waste stream with same values as 'Metal'
    const metalWasteStream = await queryRunner.manager.findOne(
      WasteStreamsEntity,
      {
        where: { name: 'METAL' },
      },
    );

    if (metalWasteStream) {
      // Reset sequence for wastestreams table
      await queryRunner.query(
        `SELECT setval(pg_get_serial_sequence('"wastestreams"', 'id'), (SELECT COALESCE(MAX(id),0) FROM "wastestreams"))`,
      );

      const concreteWasteStream = queryRunner.manager.create(
        WasteStreamsEntity,
        {
          name: 'CONCRETE',
          tonPerOffRoleYard: metalWasteStream.tonPerOffRoleYard,
          tonPerFrontLoadYard: metalWasteStream.tonPerFrontLoadYard,
          tonPerCompactorYard: metalWasteStream.tonPerCompactorYard,
          colorCodeEst: metalWasteStream.colorCodeEst,
          colorCodeReal: metalWasteStream.colorCodeReal,
        },
      );
      await queryRunner.manager.save(concreteWasteStream);

      // Reset sequence for locations table
      await queryRunner.query(
        `SELECT setval(pg_get_serial_sequence('"locations"', 'id'), (SELECT COALESCE(MAX(id),0) FROM "locations"))`,
      );

      // 3. Add 'Gravel Yard' location entry
      const gravelYardLocation = queryRunner.manager.create(LocationsEntity, {
        name: 'Gravel Yard',
        type: 6, // Gravel Yard enum value
      });
      await queryRunner.manager.save(gravelYardLocation);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Concrete waste stream and related data
    const concreteWasteStream = await queryRunner.manager.findOne(
      WasteStreamsEntity,
      {
        where: { name: 'CONCRETE' },
      },
    );

    if (concreteWasteStream) {
      // Remove waste stream
      await queryRunner.manager.delete(WasteStreamsEntity, {
        name: 'CONCRETE',
      });
    }

    // Remove Gravel Yard location
    await queryRunner.manager.delete(LocationsEntity, {
      name: 'Gravel Yard',
    });

    // Revert LocationsTypeEnum
    await queryRunner.query(
      `ALTER TYPE "public"."locations_type_enum" RENAME TO "locations_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum" AS ENUM('1', '2', '3', '4', '5')`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" TYPE "public"."locations_type_enum" USING "type"::"text"::"public"."locations_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "type" SET DEFAULT '3'`,
    );
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum_old"`);
  }
}
