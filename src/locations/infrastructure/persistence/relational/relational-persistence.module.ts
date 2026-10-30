import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsEntity } from './entities/locations.entity';
import { PowerPlantsEntity } from '../../../../power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LocationsEntity, PowerPlantsEntity, AddressEntity])],
  exports: [TypeOrmModule],
})
export class RelationalLocationsPersistenceModule {}
