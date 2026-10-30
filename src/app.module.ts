import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import { JobSitesModule } from './job-sites/job-sites.module';
import { GlobalDataModule } from './global-data/global-data.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import twitterConfig from './auth-twitter/config/twitter.config';
import appleConfig from './auth-apple/config/apple.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAppleModule } from './auth-apple/auth-apple.module';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { AuthTwitterModule } from './auth-twitter/auth-twitter.module';
import { I18nModule } from 'nestjs-i18n/dist/i18n.module';
import { HeaderResolver } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './database/mongoose-config.service';
import { DatabaseConfig } from './database/config/database-config.type';
import { HaulersModule } from './haulers/haulers.module';
import { TwilioModule } from 'nestjs-twilio';
import { SmsModule } from './sms/sms.module';
import { SmsDumpsterModule } from './sms-dumpster/sms-dumpster.module';
import { BullModule } from '@nestjs/bull';
import { QueuesModule } from './queues/queues.module';
import { SentryModule } from '@travelerdev/nestjs-sentry';
import { NotificationsModule } from './notifications/notifications.module';
import { SmsDumpModule } from './sms-dump/sms-dump.module';
import { DumpsterRefusedMmrModule } from './dumpster-refused-mmr/dumpster-refused-mmr.module';
import { DumpsterStatusModule } from './dumpster-status/dumpster-status.module';
import { WastestreamsModule } from './wastestreams/wastestreams.module';
import { PowerPlantsModule } from './power-plants/power-plants.module';
import { LocationsModule } from './locations/locations.module';
import { JobSitesWasteStreamsModule } from './job-sites-waste-streams/job-sites-waste-streams.module';
import { JobSitesWastestreamsDumpstersModule } from './job-sites-wastestreams-dumpsters/job-sites-wastestreams-dumpsters.module';
import { DumpsterLiveViewModule } from './dumpster-live-view/dumpster-live-view.module';
import { CamerasModule } from './cameras/cameras.module';
import { CameraLiveViewModule } from './camera-live-view/camera-live-view.module';
import { JobSitesCamerasModule } from './job-sites-cameras/job-sites-cameras.module';
import { ExportModule } from './export/export.module';
import { CronModule } from './cron/cron.module'; // Import your CronModule
import cameraLiveViewConfig from './camera-live-view/config/camera-live-view.config';
import { VesselModule } from './vessels/vessel.module';
import { ReportSubscriptionsModule } from './report-subscriptions/report-subscriptions.module';
import { ReportExportModule } from './report-export/report-export.module';
import { GenieModule } from './genie/genie.module';
import { EmissionFactorsModule } from './emission-factors/emission-factors.module';
import { ClientReportConfigModule } from './client-report-config/client-report-config.module';
import { WasteStreamActivityMappingModule } from './waste-stream-activity-mapping/waste-stream-activity-mapping.module';
import { WasteStreamImagesModule } from './waste-stream-images/waste-stream-images.module';
import { AiTrainingModule } from './ai-training/ai-training.module';
import { WeightTicketTrainingModule } from './weight-ticket-training/weight-ticket-training.module';
import { JwtAuthGuard } from './auth/jwt-auth-guard/jwt-auth-guard.guard';
import { CarbonCreditsModule } from './carbon-credits/carbon-credits.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { ReportDownloadsModule } from './report-downloads/report-downloads.module';
import { WeightTicketsModule } from './weight-tickets/weight-tickets.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        twitterConfig,
        appleConfig,
        cameraLiveViewConfig,
      ],
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    (databaseConfig() as DatabaseConfig).isDocumentDatabase
      ? MongooseModule.forRootAsync({
          useClass: MongooseConfigService,
        })
      : TypeOrmModule.forRootAsync({
          useClass: TypeOrmConfigService,
          dataSourceFactory: async (options: DataSourceOptions) => {
            return new DataSource(options).initialize();
          },
        }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    TwilioModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        accountSid: cfg.get('TWILIO_ACCOUNT_SID'),
        authToken: cfg.get('TWILIO_AUTH_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', { infer: true }),
          port: Number(configService.get('REDIS_PORT', { infer: true })),
          password: configService.get('REDIS_PASSWORD', { infer: true }),
          maxRetriesPerRequest: 100,
          // tls: {
          //   rejectUnauthorized: false,
          // },
          db: Number(configService.get('REDIS_DATABASE', { infer: true })),
        },
      }),
      inject: [ConfigService],
    }),
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        dsn: cfg.get('SENTRY_DSN'),
        debug: true,
        environment: cfg.get('NODE_ENV'),
        release: '0.0.1',
        logLevels: ['debug'], //based on sentry.io loglevel //
        tracePropagationTargets: [/^(?!.*\.amazonaws\.com)/],
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    JobSitesModule,
    GlobalDataModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    AuthTwitterModule,
    AuthAppleModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
    HaulersModule,
    SmsModule,
    SmsDumpsterModule,
    QueuesModule,
    NotificationsModule,
    SmsDumpModule,
    DumpsterRefusedMmrModule,
    DumpsterStatusModule,
    WastestreamsModule,
    PowerPlantsModule,
    LocationsModule,
    JobSitesWasteStreamsModule,
    JobSitesWastestreamsDumpstersModule,
    DumpsterLiveViewModule,
    CamerasModule,
    CameraLiveViewModule,
    JobSitesCamerasModule,
    ExportModule,
    CronModule,
    VesselModule,
    ReportSubscriptionsModule,
    ReportExportModule,
    ClientReportConfigModule,
    WasteStreamActivityMappingModule,
    GenieModule,
    EmissionFactorsModule,
    WasteStreamImagesModule,
    AiTrainingModule,
    WeightTicketTrainingModule,
    CarbonCreditsModule,
    ExternalApiModule,
    ReportDownloadsModule,
    WeightTicketsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    CarbonCreditsModule,
    ExternalApiModule,
  ],
})
export class AppModule {}
