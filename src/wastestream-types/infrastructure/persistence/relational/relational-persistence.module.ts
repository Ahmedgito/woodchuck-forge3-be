import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteStreamTypesEntity } from './entities/wastestream-types.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WasteStreamTypesEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
