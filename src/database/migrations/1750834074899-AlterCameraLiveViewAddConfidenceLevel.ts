import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterCameraLiveViewAddConfidenceLevel1750834074899
  implements MigrationInterface
{
  name = 'AlterCameraLiveViewAddConfidenceLevel1750834074899';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'camera_live_view',
      new TableColumn({
        name: 'folio3ConfidenceLevel',
        type: 'float',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('camera_live_view', 'folio3ConfidenceLevel');
  }
}
