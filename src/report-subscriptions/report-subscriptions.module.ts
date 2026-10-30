import { Module, forwardRef } from '@nestjs/common';
import { RelationalWasteStreamsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { QueuesModule } from 'src/queues/queues.module';
import { ReportSubscriptionsController } from './report-subscriptions.controller';
import { ReportSubscriptionsService } from './report-subscriptions.service';
import { MailModule } from 'src/mail/mail.module';

const infrastructurePersistenceModule = RelationalWasteStreamsPersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    forwardRef(() => QueuesModule),
    MailModule,
  ],
  controllers: [ReportSubscriptionsController],
  providers: [ReportSubscriptionsService],
  exports: [infrastructurePersistenceModule, ReportSubscriptionsService],
})
export class ReportSubscriptionsModule {}
