import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerPlantsEntity } from './entities/power-plants.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PowerPlantsEntity, AddressEntity])],
  exports: [TypeOrmModule],
})
export class RelationalPowerPlantsPersistenceModule {}
