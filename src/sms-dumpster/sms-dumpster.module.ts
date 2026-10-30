import { Module } from '@nestjs/common';
import { SmsDumpsterService } from './sms-dumpster.service';
import { SmsDumpsterController } from './sms-dumpster.controller';
import { RelationalSmsDumpsterPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { QueuesModule } from 'src/queues/queues.module';

const infrastructurePersistenceModule = RelationalSmsDumpsterPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule, QueuesModule],
  controllers: [SmsDumpsterController],
  providers: [SmsDumpsterService],
  exports: [infrastructurePersistenceModule],
})
export class SmsDumpsterModule {}
