import { Module } from '@nestjs/common';
import { JobSitesCamerasService } from './job-sites-cameras.service';
import { JobSitesCamerasController } from './job-sites-cameras.controller';
import { RelationalJobSitesWasteStreamsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule =
  RelationalJobSitesWasteStreamsPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [JobSitesCamerasController],
  providers: [JobSitesCamerasService],
  exports: [infrastructurePersistenceModule],
})
export class JobSitesCamerasModule {}
