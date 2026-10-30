import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenieService } from './genie.service';
import { GenieController } from './genie.controller';
import { GenieEntity } from './infrastructure/persistence/relational/entities/genie.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GenieEntity])],
  controllers: [GenieController],
  providers: [GenieService],
  exports: [GenieService],
})
export class GenieModule {}

