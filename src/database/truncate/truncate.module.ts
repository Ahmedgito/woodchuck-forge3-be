import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from 'src/config/app.config';
import databaseConfig from 'src/database/config/database.config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../typeorm-config.service';
import { TruncateService } from './truncate.service';
import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { DumpsterRefusedMmrEntity } from 'src/dumpster-refused-mmr/infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { DumpsterStatusEntity } from 'src/dumpster-status/infrastructure/persistence/relational/entities/dumpster-status.entity';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { NotificationEntity } from 'src/notifications/infrastructure/persistence/relational/entities/notification.entity';
import { SmsDumpEntity } from 'src/sms-dump/infrastructure/persistence/relational/entities/sms-dump.entity';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { SmsEntity } from 'src/sms/infrastructure/persistence/relational/entities/sms.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { SessionEntity } from 'src/session/infrastructure/persistence/relational/entities/session.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
    TypeOrmModule.forFeature([
      DumpsterEntity,
      DumpsterRefusedMmrEntity,
      DumpsterStatusEntity,
      HaulerEntity,
      JobSiteEntity,
      NotificationEntity,
      SmsDumpsterEntity,
      SmsDumpEntity,
      SmsEntity,
      UserEntity,
      SessionEntity,
    ]),
  ],
  providers: [TruncateService],
})
export class TruncateModule {}
