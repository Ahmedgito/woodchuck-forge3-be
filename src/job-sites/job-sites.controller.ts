import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
  UseInterceptors,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { infinityPagination } from 'src/utils/infinity-pagination';
import { InfinityPaginationResultType } from '../utils/types/infinity-pagination-result.type';
import { NullableType } from '../utils/types/nullable.type';
import { QueryJobSiteDto } from './dto/query-job-site.dto';
import { JobSite } from './domain/job-site';
import { JobSitesService } from './job-sites.service';
import { CreateDumpsterDto } from 'src/dumpster/dto/create-dumpster.dto';
import { UpdateDumpsterDto } from 'src/dumpster/dto/update-dumpster.dto';
import { Dumpster } from 'src/dumpster/domain/dumpster';
import { Request, Response } from 'express';
import { CreateJobSiteDetailsDto } from 'src/job-sites-details/dto/create-job-site-details.dto';
import { UpdateJobSiteDetailsDto } from 'src/job-sites-details/dto/update-job-site-details.dto';
import { ParseClientfromAuthInterceptor } from 'src/users/utils/parse-clientfrom-auth/parse-clientfrom-auth.interceptor';
import { ArchiveRequestDto } from './dto/archive-report-request.dto';
import { JobSiteExportRangeDto } from './dto/jobsite-export-range.dto';

@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
  RoleEnum.cms
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Job Sites')
@Controller({
  path: 'jobsites',
  version: '1',
})
export class JobSitesController {
  constructor(private readonly jobSitesService: JobSitesService) {}

  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing, RoleEnum.end_client)
  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createJobSiteDto: CreateJobSiteDetailsDto) {
    return this.jobSitesService.createJobSiteDetails(createJobSiteDto);
  }

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @UseInterceptors(ParseClientfromAuthInterceptor)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: QueryJobSiteDto,
    @Req() req,
  ): Promise<InfinityPaginationResultType<JobSite>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }
    if (req.user.role?.id === RoleEnum.end_client) {
      query.filters = {
        ...query.filters,
        endClientId: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      };
    }

    return infinityPagination(
      await this.jobSitesService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Get(':id')
  @UseInterceptors(ParseClientfromAuthInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(
    @Param('id') id: JobSite['id'],
    @Req() req: Request,
  ): Promise<NullableType<JobSite>> {
    let queryFilters: any = req.query.filters;
    const loggedInUser = req.user;
    queryFilters = queryFilters !== undefined ? JSON.parse(queryFilters) : null;
    return this.jobSitesService.findOne({ id }, loggedInUser, queryFilters);
  }

  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing, RoleEnum.end_client)
  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(
    @Param('id') id: JobSite['id'],
    @Body() updateJobSiteDto: UpdateJobSiteDetailsDto,
  ): Promise<JobSite | null> {
    return this.jobSitesService.updateJobSiteDetails(id, updateJobSiteDto);
  }

  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing, RoleEnum.end_client)
  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: JobSite['id']): Promise<void> {
    return this.jobSitesService.softDelete(id);
  }

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Get(':id/dumpsterStatus')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  getDumpsterStatus(
    @Param('id') id: JobSite['id'],
  ): Promise<NullableType<object>> {
    return this.jobSitesService.getDumpsterStatus(id);
  }

  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing, RoleEnum.end_client)
  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Patch(':id/addDumpster')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  addDumpster(
    @Param('id') id: JobSite['id'],
    @Body() createDumpsterDto: CreateDumpsterDto,
  ) {
    return this.jobSitesService.createDumpster(id, createDumpsterDto);
  }

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Get(':id/getDumpster')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  getDumpster(@Param('id') id: JobSite['id']): Promise<NullableType<object>> {
    return this.jobSitesService.getDumpster(id);
  }

  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing, RoleEnum.end_client)
  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Patch('/updateDumpster/:dumpsterId')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'dumpsterId',
    type: String,
    required: true,
  })
  updateDumpster(
    @Param('dumpsterId') dumpsterId: Dumpster['id'],
    @Body() updateDumpsterDto: UpdateDumpsterDto,
  ) {
    return this.jobSitesService.updateDumpster(dumpsterId, updateDumpsterDto);
  }

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Post('/send-archive-report')
  @HttpCode(HttpStatus.CREATED)
  sendArchiveReport(@Body() dto: ArchiveRequestDto, @Req() req: Request) {
    return this.jobSitesService.sendArchiveReport(dto, req.user);
  }

  // FE export async flow for job sites - initiate export
  @Post('export-archive-report')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportArchiveReport(
    @Body() dto: JobSiteExportRangeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.jobSitesService.exportArchiveReport(
      dto,
      req.user,
    );
    res.status(202).json(result);
  }
}
