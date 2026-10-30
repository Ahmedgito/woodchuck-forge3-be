import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DemoJobService } from './jobs/demo-job.service';
import { JobSitesWastestreamsDumpstersModule } from '../job-sites-wastestreams-dumpsters/job-sites-wastestreams-dumpsters.module'; // Import the module
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { CameraLiveDataJobService } from './jobs/camera-live-data-job.service';
import { CameraLiveViewModule } from 'src/camera-live-view/camera-live-view.module';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { ReportEmailJobService } from './jobs/monthly-report-email-job.service';
import { ReportSubscriptionsModule } from 'src/report-subscriptions/report-subscriptions.module';
import { MailModule } from 'src/mail/mail.module';
import { JobSitesModule } from 'src/job-sites/job-sites.module';
import { HomeModule } from 'src/home/home.module';
import { QueuesModule } from 'src/queues/queues.module';
import { UsersModule } from 'src/users/users.module';
import { ClientReportConfigModule } from 'src/client-report-config/client-report-config.module';
import { WasteStreamActivityMappingModule } from 'src/waste-stream-activity-mapping/waste-stream-activity-mapping.module';
import { ReportExportModule } from 'src/report-export/report-export.module';
import { ReportLoggerModule } from 'src/report-logger/report-logger.module';
import { CronController } from './cron.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      WasteStreamCamerasEntity,
      JobSiteEntity,
      JobSitesCamerasEntity,
      UserEntity,
    ]),
    JobSitesWastestreamsDumpstersModule,
    CameraLiveViewModule,
    ReportSubscriptionsModule,
    MailModule,
    JobSitesModule,
    HomeModule,
    QueuesModule,
    UsersModule,
    ClientReportConfigModule,
    WasteStreamActivityMappingModule,
    ReportExportModule,
    ReportLoggerModule,
  ],
  controllers: [CronController],
  providers: [DemoJobService, CameraLiveDataJobService, ReportEmailJobService],
})
export class CronModule {}
