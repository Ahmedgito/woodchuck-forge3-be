import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReportLogTable1776600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "report_log_level_enum" AS ENUM ('log', 'warn', 'error')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'report_log',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['log', 'warn', 'error'],
            enumName: 'report_log_level_enum',
            default: `'log'`,
          },
          {
            name: 'context',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('report_log');
    await queryRunner.query(`DROP TYPE "report_log_level_enum"`);
  }
}
