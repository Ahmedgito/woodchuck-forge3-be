import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesModule } from 'src/job-sites/job-sites.module';
import { JobSitesWasteStreamsModule } from 'src/job-sites-waste-streams/job-sites-waste-streams.module';
import { ApiKeyModule } from 'src/api-key/api-key.module';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key.guard';
import { RateLimitGuard } from 'src/auth/guards/rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobSiteEntity]),
    JobSitesModule,
    JobSitesWasteStreamsModule,
    ApiKeyModule,
  ],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyAuthGuard, RateLimitGuard],
})
export class ExternalApiModule {}
