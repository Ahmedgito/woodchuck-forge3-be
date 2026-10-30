import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { RelationalLocationsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalLocationsPersistenceModule;

@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [infrastructurePersistenceModule],
  imports: [infrastructurePersistenceModule],
})
export class LocationsModule {}
