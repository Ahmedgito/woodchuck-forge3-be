import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpsterRefusedMmrEntity } from './entities/dumpster-refused-mmr.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DumpsterRefusedMmrEntity])],
})
export class RelationalDumpsterRefusedMmrPersistenceModule {}
