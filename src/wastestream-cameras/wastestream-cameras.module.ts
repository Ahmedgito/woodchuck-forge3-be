import { Module } from '@nestjs/common';
import { RelationalWasteStreamCamerasPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule =
  RelationalWasteStreamCamerasPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  exports: [infrastructurePersistenceModule],
})
export class WasteStreamCamerasModule {}
