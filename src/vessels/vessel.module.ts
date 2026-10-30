import { Module } from '@nestjs/common';
import { RelationalWasteStreamsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { VesselController } from './vessel.controller';
import { VesselService } from './vessel.service';

const infrastructurePersistenceModule = RelationalWasteStreamsPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [VesselController],
  providers: [VesselService],
  exports: [infrastructurePersistenceModule],
})
export class VesselModule {}
