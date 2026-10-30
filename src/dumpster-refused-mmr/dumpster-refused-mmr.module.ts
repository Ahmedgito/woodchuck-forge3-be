import { Module } from '@nestjs/common';
import { DumpsterRefusedMmrController } from './dumpster-refused-mmr.controller';
import { DumpsterRefusedMmrService } from './dumpster-refused-mmr.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpsterRefusedMmrEntity } from './infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DumpsterRefusedMmrEntity])],
  controllers: [DumpsterRefusedMmrController],
  providers: [DumpsterRefusedMmrService],
})
export class DumpsterRefusedMmrModule {}
