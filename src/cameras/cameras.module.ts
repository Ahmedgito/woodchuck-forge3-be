import { Module } from '@nestjs/common';

import { CamerasController } from './cameras.controller';
import { CamerasService } from './cameras.service';
import { RelationalCameraPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { QueuesModule } from 'src/queues/queues.module';

const infrastructurePersistenceModule = RelationalCameraPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule, QueuesModule],
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [CamerasService, infrastructurePersistenceModule],
})
export class CamerasModule {}
