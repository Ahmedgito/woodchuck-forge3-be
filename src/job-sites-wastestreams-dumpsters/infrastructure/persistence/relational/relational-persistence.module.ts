import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSiteWastestreamsDumpstersEntity } from './entities/job-site-wastestreams-dumpsters.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobSiteWastestreamsDumpstersEntity,
      JobSitesWasteStreamsEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalJobSitesWastestreamsDumpstersPersistenceModule {}
