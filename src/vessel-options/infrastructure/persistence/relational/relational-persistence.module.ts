import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VesselOptionsEntity } from './entities/vessel-options.entity';
import { VesselEntity } from 'src/vessels/infrastructure/persistence/relational/entities/vessel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VesselOptionsEntity, VesselEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
