import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueuesService } from './queues.service';
import { SendSmsDumpsterReqConsumer } from './consumers/sendSmsDumpsterReq.consumer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { UpdateGlobalDataReqConsumer } from './consumers/UpdateGlobalDataReq.consumer';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { AddJobsiteWastestreamsDumpstersConsumers } from './consumers/AddJobsiteWastestreamsDumpsters.consumer';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { ReportGenerationConsumer } from './consumers/ReportGeneration.consumer';
import { MailModule } from 'src/mail/mail.module';
import { forwardRef } from '@nestjs/common';
import { JobSitesModule } from 'src/job-sites/job-sites.module';
import { HomeModule } from 'src/home/home.module';
import { ReportSubscriptionsModule } from 'src/report-subscriptions/report-subscriptions.module';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { ReportExportModule } from 'src/report-export/report-export.module';
import { ClientReportConfigModule } from 'src/client-report-config/client-report-config.module';
import { WasteStreamImagesModule } from 'src/waste-stream-images/waste-stream-images.module';
import { ReportLoggerModule } from 'src/report-logger/report-logger.module';
import { ReportDownloadsModule } from 'src/report-downloads/report-downloads.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'sms-dumpster-request' }),
    BullModule.registerQueue({ name: 'global-data-update' }),
    BullModule.registerQueue({ name: 'add-JobsiteWastestreamsDumpsters' }),
    BullModule.registerQueue({ name: 'report-generation' }),
    MailModule,
    forwardRef(() => JobSitesModule),
    forwardRef(() => HomeModule),
    forwardRef(() => ReportSubscriptionsModule),
    forwardRef(() => ReportExportModule),
    ClientReportConfigModule,
    WasteStreamImagesModule,
    ReportLoggerModule,
    ReportDownloadsModule,
    TypeOrmModule.forFeature([
      SmsDumpsterEntity,
      JobSiteWastestreamsDumpstersEntity,
      JobSitesWasteStreamsEntity,
      UserEntity,
    ]),
  ],
  providers: [
    QueuesService,
    SendSmsDumpsterReqConsumer,
    UpdateGlobalDataReqConsumer,
    AddJobsiteWastestreamsDumpstersConsumers,
    ReportGenerationConsumer,
  ],
  exports: [QueuesService],
})
export class QueuesModule {}
