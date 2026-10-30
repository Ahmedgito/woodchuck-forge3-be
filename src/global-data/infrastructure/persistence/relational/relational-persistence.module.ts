import { Module } from '@nestjs/common';
import { GlobalDataRepository } from '../global-data.repository';
import { GlobalDataRelationalRepository } from './repositories/global-data.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDataEntity } from './entities/global-data.entity';
import { QueuesModule } from 'src/queues/queues.module';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalDataEntity]), QueuesModule],
  providers: [
    {
      provide: GlobalDataRepository,
      useClass: GlobalDataRelationalRepository,
    },
  ],
  exports: [GlobalDataRepository],
})
export class RelationalGlobalDataPersistenceModule {}
