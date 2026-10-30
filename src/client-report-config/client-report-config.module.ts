import { Module, forwardRef } from '@nestjs/common';
import { RelationalClientReportConfigPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { ClientReportConfigService } from './client-report-config.service';
import { ClientReportConfigController } from './client-report-config.controller';
import { ReportExportModule } from 'src/report-export/report-export.module';
import { MailModule } from 'src/mail/mail.module';
import { ReportSubscriptionsModule } from 'src/report-subscriptions/report-subscriptions.module';
import { ReportLoggerModule } from 'src/report-logger/report-logger.module';
import { ReportDownloadsModule } from 'src/report-downloads/report-downloads.module';

const infrastructurePersistenceModule =
  RelationalClientReportConfigPersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    ReportExportModule,
    MailModule,
    forwardRef(() => ReportSubscriptionsModule),
    ReportLoggerModule,
    ReportDownloadsModule,
  ],
  controllers: [ClientReportConfigController],
  providers: [ClientReportConfigService],
  exports: [infrastructurePersistenceModule, ClientReportConfigService],
})
export class ClientReportConfigModule {}
