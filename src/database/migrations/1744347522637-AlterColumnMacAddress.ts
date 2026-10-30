import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMacAddressToIpAddress1681234567890
  implements MigrationInterface
{
  name = 'AlterColumnMacAddress1744347522637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE camera
      RENAME COLUMN "macAddress" TO "ipAddress"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE camera
      RENAME COLUMN "ipAddress" TO "macAddress"
    `);
  }
}
