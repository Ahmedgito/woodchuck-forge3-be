import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteStreamActivityMappingEntity } from './entities/waste-stream-activity-mapping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WasteStreamActivityMappingEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamActivityMappingPersistenceModule {}
