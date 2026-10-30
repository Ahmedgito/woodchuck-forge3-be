import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmissionFactorEntity } from 'src/emission-factors/infrastructure/persistence/relational/entities/emission-factor.entity';
import { EmissionFactorsSeedService } from './emission-factors-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmissionFactorEntity])],
  providers: [EmissionFactorsSeedService],
  exports: [EmissionFactorsSeedService],
})
export class EmissionFactorsSeedModule {}

