import { Module } from '@nestjs/common';
import { DumpsterLiveViewController } from './dumpster-live-view.controller';
import { DumpsterLiveViewService } from './dumpster-live-view.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpsterLiveViewEntity } from './infrastructure/persistence/relational/entities/dumpster-live-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DumpsterLiveViewEntity])],
  controllers: [DumpsterLiveViewController],
  providers: [DumpsterLiveViewService],
})
export class DumpsterLiveViewModule {}
