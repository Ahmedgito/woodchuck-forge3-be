import { Module, forwardRef } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { ConfigModule } from '@nestjs/config';
import { JobSitesWasteStreamsModule } from 'src/job-sites-waste-streams/job-sites-waste-streams.module';
import { JobSiteStats } from 'src/job-sites-waste-streams/utils/job-sites-stats';
import { MailModule } from 'src/mail/mail.module';
import { PuppeteerModule } from 'src/puppeteer/puppeteer.module';
import { JobSitesModule } from 'src/job-sites/job-sites.module';
import { UsersModule } from 'src/users/users.module';
import { QueuesModule } from 'src/queues/queues.module';
import { ReportExportModule } from 'src/report-export/report-export.module';
import { EmissionFactorsModule } from 'src/emission-factors/emission-factors.module';
import { CarbonCreditsModule } from 'src/carbon-credits/carbon-credits.module';

@Module({
  imports: [
    ConfigModule,
    JobSitesWasteStreamsModule,
    MailModule,
    PuppeteerModule,
    forwardRef(() => JobSitesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => QueuesModule),
    ReportExportModule,
    EmissionFactorsModule,
    CarbonCreditsModule,
  ],
  controllers: [HomeController],
  providers: [HomeService, JobSiteStats],
  exports: [HomeService],
})
export class HomeModule {}
