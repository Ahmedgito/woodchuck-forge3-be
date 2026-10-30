import {
  Controller,
  Get,
  Query,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
  Body,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { HomeService } from './home.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard/jwt-auth-guard.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { FilterBarGraphDto } from 'src/job-sites-waste-streams/dto/query-bar-graph.dto';
import { GetUser } from 'src/utils/user.decorator';
import { User } from 'src/users/domain/user';
import { ParseClientfromAuthInterceptor } from 'src/users/utils/parse-clientfrom-auth/parse-clientfrom-auth.interceptor';
import { SkipAll } from 'src/auth/skip-all.decorator';
import { QueryHomeDto } from './dto/query-home.dto';
import { InfinityPaginationResultType } from 'src/utils/types/infinity-pagination-result.type';
import { infinityPagination } from 'src/utils/infinity-pagination';
import { ArchiveDashboardReportRequestDto } from './dto/archive-dashboard-report-request.dto';
import { ExportDashboardRangeDto } from './dto/export-dashboard-range.dto';
import { Response } from 'express';

@ApiTags('Home')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ParseClientfromAuthInterceptor)
@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
  RoleEnum.cms,
)
@SerializeOptions({
  groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
})
@Controller({
  path: 'home',
  version: '1',
})
export class HomeController {
  constructor(private homeservice: HomeService) {}

  @Get('tree-graph-stats')
  getTreeGraphStats(
    @Query() filterBarGraphDto: FilterBarGraphDto,
    @GetUser() user: User,
  ) {
    return this.homeservice.getDashboardTreeGraphStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      user,
    );
  }

  @Get('tree-graph-diversion-stats')
  getTreeGraphDiversionStats(
    @Query() filterBarGraphDto: FilterBarGraphDto,
    @GetUser() user: User,
  ) {
    return this.homeservice.getDashboardTreeGraphDiversionStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      user,
    );
  }

  @Get('tree-graph-waste-streams-type-stats')
  getTreeGraphWasteStreamsTypeStats(
    @Query() filterBarGraphDto: FilterBarGraphDto,
    @GetUser() user: User,
  ) {
    return this.homeservice.getDashboardTreeGraphWasteStreamsStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      user,
    );
  }

  @Get('tree-graph-wood-waste-diversion-stats')
  getTreeGraphWoodWasteDiversionStats(
    @Query() filterBarGraphDto: FilterBarGraphDto,
    @GetUser() user: User,
  ) {
    return this.homeservice.getDashboardWoodWasteDiversionStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      user,
    );
  }

  @Get('get-endclient-jobsite-owners')
  async getEndclientJobsiteOwners(
    @Query() query: QueryHomeDto,
    @GetUser() user: User,
  ): Promise<InfinityPaginationResultType<User>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.homeservice.getEndclientJobsiteOwners({
        user,
        filterOptions: query?.filters,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @SkipAll()
  @Get('get-diversion-stats')
  getDiversionStats() {
    return this.homeservice.getDiversionStats();
  }

  @Post('send-archive-report')
  sendArchiveReport(
    @Body() dto: ArchiveDashboardReportRequestDto,
    @GetUser() user: any,
  ) {
    return this.homeservice.sendArchiveReport(dto, user);
  }

  // FE export async flow - initiate export
  @Post('export-archive-report')
  async exportArchiveReport(
    @Body() dto: ExportDashboardRangeDto,
    @GetUser() user: any,
    @Res() res: Response,
  ) {
    const result = await this.homeservice.exportArchiveReport(dto, user);
    res.status(202).json(result);
  }
}
