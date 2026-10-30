import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteStreamImageEntity } from './entities/waste-stream-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WasteStreamImageEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamImagesPersistenceModule {}
