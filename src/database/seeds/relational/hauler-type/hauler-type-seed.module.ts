import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HaulerTypeSeedService } from './hauler-type-seed.service';
import { HaulerTypeEntity } from 'src/haulertype/infrastructure/persistence/relational/entities/haulertype.entity';
@Module({
  imports: [TypeOrmModule.forFeature([HaulerTypeEntity])],
  providers: [HaulerTypeSeedService],
  exports: [HaulerTypeSeedService],
})
export class HaulerTypeSeedModule {}
