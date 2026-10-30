import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RelationalNotificationPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { SmsDumpsterNotificationGateway } from './sms-dumpster-notification/sms-dumpster-notification.gateway';
import { SmsDumpsterModule } from 'src/sms-dumpster/sms-dumpster.module';

const infrastructurePersistenceModule = RelationalNotificationPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule, SmsDumpsterModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsDumpsterNotificationGateway],
  exports: [infrastructurePersistenceModule, SmsDumpsterNotificationGateway],
})
export class NotificationsModule {}
