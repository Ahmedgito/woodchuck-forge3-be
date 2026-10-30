import { Module } from '@nestjs/common';
import { PowerPlantsService } from './power-plants.service';
import { PowerPlantsController } from './power-plants.controller';
import { RelationalPowerPlantsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalPowerPlantsPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [PowerPlantsController],
  providers: [PowerPlantsService],
  exports: [infrastructurePersistenceModule],
})
export class PowerPlantsModule {}
