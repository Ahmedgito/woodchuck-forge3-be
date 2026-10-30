import { Module } from '@nestjs/common';
import { DumpsterStatusController } from './dumpster-status.controller';
import { DumpsterStatusService } from './dumpster-status.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpsterStatusEntity } from './infrastructure/persistence/relational/entities/dumpster-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DumpsterStatusEntity])],
  controllers: [DumpsterStatusController],
  providers: [DumpsterStatusService],
})
export class DumpsterStatusModule {}
