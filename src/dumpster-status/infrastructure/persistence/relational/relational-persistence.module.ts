import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpsterStatusEntity } from './entities/dumpster-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DumpsterStatusEntity])],
})
export class RelationalDumpsterStatusPersistenceModule {}
