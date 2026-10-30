import {
  Controller,
  Query,
  Body,
  Post,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExportUserFilterDto } from './dto/query-filter.dto';
import { ExportService } from './export.service';
import { AuthEmailLoginDto } from 'src/auth/dto/auth-email-login.dto';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key.guard';
import { RateLimitGuard } from 'src/auth/guards/rate-limit.guard';
import { SkipAll } from 'src/auth/skip-all.decorator';

@ApiBearerAuth()
@ApiTags('Export')
@Controller({
  path: 'export',
  version: '1',
})
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // API Key protected version
  @SkipAll()
  @UseGuards(ApiKeyAuthGuard, RateLimitGuard)
  @Get('user')
  async exportUserWithApiKey(
    @Req() req,
    @Query() exportUserFilterDto: ExportUserFilterDto,
  ) {
    const userId = Number(req.user.id);
    return this.exportService.exportUserByUserId(exportUserFilterDto, userId);
  }
}
