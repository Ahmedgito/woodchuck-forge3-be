import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDataSeedService } from './global-data-seed.service';
import { GlobalDataEntity } from 'src/global-data/infrastructure/persistence/relational/entities/global-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalDataEntity])],
  providers: [GlobalDataSeedService],
  exports: [GlobalDataSeedService],
})
export class GlobalDataSeedModule {}
