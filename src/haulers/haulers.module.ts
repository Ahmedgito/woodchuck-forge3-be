import { Module } from '@nestjs/common';
import { HaulersService } from './haulers.service';
import { HaulersController } from './haulers.controller';
import { RelationalHaulerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalHaulerPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [HaulersController],
  providers: [HaulersService],
  exports: [infrastructurePersistenceModule],
})
export class HaulersModule {}
