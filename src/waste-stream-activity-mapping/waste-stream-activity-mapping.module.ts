import { Module } from '@nestjs/common';
import { RelationalWasteStreamActivityMappingPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { WasteStreamActivityMappingService } from './waste-stream-activity-mapping.service';

const infrastructurePersistenceModule =
  RelationalWasteStreamActivityMappingPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  providers: [WasteStreamActivityMappingService],
  exports: [infrastructurePersistenceModule, WasteStreamActivityMappingService],
})
export class WasteStreamActivityMappingModule {}
