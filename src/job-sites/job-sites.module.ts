import { Module, forwardRef } from '@nestjs/common';

import { JobSitesController } from './job-sites.controller';
import { JobSitesService } from './job-sites.service';
import { RelationalJobSitePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { QueuesModule } from 'src/queues/queues.module';
import { PuppeteerModule } from 'src/puppeteer/puppeteer.module';
import { MailModule } from 'src/mail/mail.module';
import { JobSitesWasteStreamsModule } from 'src/job-sites-waste-streams/job-sites-waste-streams.module';
import { ReportSubscriptionsModule } from 'src/report-subscriptions/report-subscriptions.module';
import { ReportExportModule } from 'src/report-export/report-export.module';
import { WasteStreamImagesModule } from 'src/waste-stream-images/waste-stream-images.module';
import { CarbonCreditsModule } from 'src/carbon-credits/carbon-credits.module';

const infrastructurePersistenceModule = RelationalJobSitePersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    forwardRef(() => QueuesModule),
    PuppeteerModule,
    MailModule,
    JobSitesWasteStreamsModule,
    forwardRef(() => ReportSubscriptionsModule),
    ReportExportModule,
    WasteStreamImagesModule,
    CarbonCreditsModule,
  ],
  controllers: [JobSitesController],
  providers: [JobSitesService],
  exports: [JobSitesService, infrastructurePersistenceModule],
})
export class JobSitesModule {}
