import { Module } from '@nestjs/common';
import { JobSitesWastestreamsDumpstersController } from './job-sites-wastestreams-dumpsters.controller';
import { JobSitesWastestreamsDumpstersService } from './job-sites-wastestreams-dumpsters.service';
import { RelationalJobSitesWastestreamsDumpstersPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { QueuesModule } from 'src/queues/queues.module';

const infrastructurePersistenceModule =
  RelationalJobSitesWastestreamsDumpstersPersistenceModule;
@Module({
  imports: [infrastructurePersistenceModule, QueuesModule],
  controllers: [JobSitesWastestreamsDumpstersController],
  providers: [JobSitesWastestreamsDumpstersService],
  exports: [
    infrastructurePersistenceModule,
    JobSitesWastestreamsDumpstersService,
  ],
})
export class JobSitesWastestreamsDumpstersModule {}
