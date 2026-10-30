import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteStreamTypeVesselsEntity } from './entities/wastestream-type-vessels.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WasteStreamTypeVesselsEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
