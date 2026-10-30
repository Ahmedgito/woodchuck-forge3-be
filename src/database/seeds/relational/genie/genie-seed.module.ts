import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenieEntity } from 'src/genie/infrastructure/persistence/relational/entities/genie.entity';
import { GenieSeedService } from './genie-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([GenieEntity])],
  providers: [GenieSeedService],
  exports: [GenieSeedService],
})
export class GenieSeedModule {}
