import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmissionFactorsService } from './emission-factors.service';
import { EmissionFactorsController } from './emission-factors.controller';
import { EmissionFactorEntity } from './infrastructure/persistence/relational/entities/emission-factor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmissionFactorEntity])],
  controllers: [EmissionFactorsController],
  providers: [EmissionFactorsService],
  exports: [EmissionFactorsService],
})
export class EmissionFactorsModule {}

