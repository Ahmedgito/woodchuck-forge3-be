import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateWasteStreamImagesTable1772000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the ai_status enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ai_status_enum AS ENUM ('pending', 'processing', 'complete', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'waste_stream_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'jobsiteWasteStreamId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'jobSiteId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'wasteStreamId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'fileId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'uploadedById',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'uploadedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'aiStatus',
            type: 'ai_status_enum',
            default: "'pending'",
          },
          {
            name: 'aiConfidenceLevel',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'adminConfidenceOverride',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'aiVerified',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'aiResponseRaw',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isLatest',
            type: 'boolean',
            default: true,
          },
          {
            name: 'replacedById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 1,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // Indexes
    await queryRunner.createIndex(
      'waste_stream_images',
      new TableIndex({
        name: 'IDX_wsi_jobsite_waste_stream',
        columnNames: ['jobsiteWasteStreamId'],
      }),
    );
    await queryRunner.createIndex(
      'waste_stream_images',
      new TableIndex({
        name: 'IDX_wsi_job_site',
        columnNames: ['jobSiteId'],
      }),
    );
    await queryRunner.createIndex(
      'waste_stream_images',
      new TableIndex({
        name: 'IDX_wsi_waste_stream',
        columnNames: ['wasteStreamId'],
      }),
    );
    await queryRunner.createIndex(
      'waste_stream_images',
      new TableIndex({
        name: 'IDX_wsi_uploaded_by',
        columnNames: ['uploadedById'],
      }),
    );
    await queryRunner.createIndex(
      'waste_stream_images',
      new TableIndex({
        name: 'IDX_wsi_is_latest',
        columnNames: ['isLatest'],
      }),
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'waste_stream_images',
      new TableForeignKey({
        name: 'FK_wsi_jobsite_waste_stream',
        columnNames: ['jobsiteWasteStreamId'],
        referencedTableName: 'jobsites_wastestreams',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT', // Images persist even when waste stream is deleted
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'waste_stream_images',
      new TableForeignKey({
        name: 'FK_wsi_file',
        columnNames: ['fileId'],
        referencedTableName: 'file',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'waste_stream_images',
      new TableForeignKey({
        name: 'FK_wsi_uploaded_by',
        columnNames: ['uploadedById'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('waste_stream_images', 'FK_wsi_uploaded_by');
    await queryRunner.dropForeignKey('waste_stream_images', 'FK_wsi_file');
    await queryRunner.dropForeignKey('waste_stream_images', 'FK_wsi_jobsite_waste_stream');
    await queryRunner.dropIndex('waste_stream_images', 'IDX_wsi_is_latest');
    await queryRunner.dropIndex('waste_stream_images', 'IDX_wsi_uploaded_by');
    await queryRunner.dropIndex('waste_stream_images', 'IDX_wsi_waste_stream');
    await queryRunner.dropIndex('waste_stream_images', 'IDX_wsi_job_site');
    await queryRunner.dropIndex('waste_stream_images', 'IDX_wsi_jobsite_waste_stream');
    await queryRunner.dropTable('waste_stream_images');
    await queryRunner.query(`DROP TYPE IF EXISTS ai_status_enum;`);
  }
}
