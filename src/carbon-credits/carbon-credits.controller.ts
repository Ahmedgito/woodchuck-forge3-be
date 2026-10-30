import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CarbonCreditsService } from './carbon-credits.service';
import {
  UpsertCarbonCreditDto,
  UpsertCarbonCreditBulkDto,
} from './dto/upsert-carbon-credit.dto';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key.guard';
import { RateLimitGuard } from 'src/auth/guards/rate-limit.guard';
import { SkipAll } from 'src/auth/skip-all.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard/jwt-auth-guard.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';

@ApiTags('Carbon Credits')
@Controller({
  path: 'carbon-credits',
  version: '1',
})
export class CarbonCreditsController {
  constructor(private readonly carbonCreditsService: CarbonCreditsService) {}

  // ── Webhook endpoints (API-key protected, for CO2True) ──

  @SkipAll()
  @UseGuards(ApiKeyAuthGuard, RateLimitGuard)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async upsertCarbonCredit(@Body() dto: UpsertCarbonCreditDto) {
    return this.carbonCreditsService.upsert(dto);
  }

  @SkipAll()
  @UseGuards(ApiKeyAuthGuard, RateLimitGuard)
  @Post('webhook/bulk')
  @HttpCode(HttpStatus.OK)
  async upsertCarbonCreditBulk(@Body() dto: UpsertCarbonCreditBulkDto) {
    return this.carbonCreditsService.upsertBulk(dto.items);
  }

  // ── Internal read endpoints (JWT-protected, for frontend) ──

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleEnum.admin,
    RoleEnum.general_contractor,
    RoleEnum.power_plant,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.cms,
  )
  @Get('jobsite/:jobSiteId')
  @HttpCode(HttpStatus.OK)
  async getByJobSite(@Param('jobSiteId', ParseIntPipe) jobSiteId: number) {
    return this.carbonCreditsService.findByJobSiteId(jobSiteId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleEnum.admin,
    RoleEnum.general_contractor,
    RoleEnum.power_plant,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.cms,
  )
  @Get('client/:clientId')
  @HttpCode(HttpStatus.OK)
  async getClientAggregation(
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    return this.carbonCreditsService.getClientAggregation(clientId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.admin)
  @Get('admin/aggregation')
  @HttpCode(HttpStatus.OK)
  async getAdminAggregation() {
    return this.carbonCreditsService.getAdminAggregation();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.admin)
  @Get('admin/client-breakdown')
  @HttpCode(HttpStatus.OK)
  async getClientBreakdown() {
    return this.carbonCreditsService.getClientBreakdown();
  }
}
