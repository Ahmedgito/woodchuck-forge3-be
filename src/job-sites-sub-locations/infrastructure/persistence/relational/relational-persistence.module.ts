import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsiteSubLocationEntity } from './entities/job-sites-sub-locations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobsiteSubLocationEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
