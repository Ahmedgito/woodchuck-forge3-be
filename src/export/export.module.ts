import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { QueuesModule } from 'src/queues/queues.module';
import { AuthModule } from 'src/auth/auth.module';
import { HomeModule } from 'src/home/home.module';
import { JobSitesModule } from 'src/job-sites/job-sites.module';
import { JobSitesWasteStreamsModule } from 'src/job-sites-waste-streams/job-sites-waste-streams.module';
import { UsersModule } from 'src/users/users.module';
import { ApiKeyModule } from 'src/api-key/api-key.module';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key.guard';
import { RateLimitGuard } from 'src/auth/guards/rate-limit.guard';

@Module({
  imports: [
    QueuesModule,
    AuthModule,
    HomeModule,
    JobSitesModule,
    JobSitesWasteStreamsModule,
    UsersModule,
    ApiKeyModule,
  ],
  controllers: [ExportController],
  providers: [ExportService, ApiKeyAuthGuard, RateLimitGuard],
})
export class ExportModule {}
