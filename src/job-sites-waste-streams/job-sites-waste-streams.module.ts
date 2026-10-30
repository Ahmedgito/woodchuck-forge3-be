import { Module } from '@nestjs/common';
import { JobSitesWasteStreamsService } from './job-sites-waste-streams.service';
import { JobSitesWasteStreamsController } from './job-sites-waste-streams.controller';
import { RelationalJobSitesWasteStreamsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { JobSiteStats } from './utils/job-sites-stats';
import { EmissionFactorsModule } from 'src/emission-factors/emission-factors.module';

const infrastructurePersistenceModule =
  RelationalJobSitesWasteStreamsPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule, EmissionFactorsModule],
  controllers: [JobSitesWasteStreamsController],
  providers: [JobSitesWasteStreamsService, JobSiteStats],
  exports: [infrastructurePersistenceModule, JobSitesWasteStreamsService],
})
export class JobSitesWasteStreamsModule {}
