import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpsterLiveViewEntity } from './entities/dumpster-live-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DumpsterLiveViewEntity])],
})
export class RelationalDumpsterLiveViewPersistenceModule {}
