import { Module } from '@nestjs/common';
import { WastestreamsController } from './wastestreams.controller';
import { WastestreamsService } from './wastestreams.service';
import { RelationalWasteStreamsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { QueuesModule } from 'src/queues/queues.module';

const infrastructurePersistenceModule = RelationalWasteStreamsPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule, QueuesModule],
  controllers: [WastestreamsController],
  providers: [WastestreamsService],
  exports: [infrastructurePersistenceModule],
})
export class WastestreamsModule {}
