import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExternalApiService } from './external-api.service';
import { QueryExternalJobSiteDto } from './dto/query-external-jobsite.dto';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key.guard';
import { RateLimitGuard } from 'src/auth/guards/rate-limit.guard';
import { SkipAll } from 'src/auth/skip-all.decorator';
import { infinityPagination } from 'src/utils/infinity-pagination';

@ApiTags('External API')
@SkipAll()
@UseGuards(ApiKeyAuthGuard, RateLimitGuard)
@Controller({
  path: 'external',
  version: '1',
})
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get('jobsites')
  @HttpCode(HttpStatus.OK)
  async listJobSites(@Query() query: QueryExternalJobSiteDto) {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 50;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.externalApiService.findAllJobSites({ page, limit }),
      { page, limit },
    );
  }

  @Get('jobsites/:id')
  @HttpCode(HttpStatus.OK)
  async getJobSite(@Param('id', ParseIntPipe) id: number) {
    const jobSite = await this.externalApiService.findJobSiteById(id);
    if (!jobSite) {
      throw new NotFoundException('Job site not found');
    }
    return jobSite;
  }
}
