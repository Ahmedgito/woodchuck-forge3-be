import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HaulerEntity } from './entities/hauler.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HaulerEntity])],
  exports: [TypeOrmModule],
})
export class RelationalHaulerPersistenceModule {}
