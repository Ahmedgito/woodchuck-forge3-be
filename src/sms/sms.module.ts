import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { RelationalSmsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { JobSitesModule } from 'src/job-sites/job-sites.module';
import { HaulersModule } from 'src/haulers/haulers.module';
import { SmsDumpsterModule } from 'src/sms-dumpster/sms-dumpster.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { GlobalDataModule } from 'src/global-data/global-data.module';

const infrastructurePersistenceModule = RelationalSmsPersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    JobSitesModule,
    HaulersModule,
    SmsDumpsterModule,
    NotificationsModule,
    GlobalDataModule,
  ],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [infrastructurePersistenceModule, SmsService],
})
export class SmsModule {}
