import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobSitesWasteStreamsService } from './job-sites-waste-streams.service';
import { RolesGuard } from 'src/roles/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { DumpsterTypeEnum } from './dumpsterType.enum';
import { CreateJobSitesWasteStreamsDto } from './dto/create-job-sites-waste-streams.dto';
import {
  FilterBarGraphDto,
  FilterBarGraphGroupDto,
} from './dto/query-bar-graph.dto';
import { FilterMapDataDto } from './dto/query-map-data.dto';
import { MapDataStatsDto } from './dto/map-data-stats.dto';
import { transformDumpsterType } from 'src/utils/transformers/dumpster-type.transformer';
import { UpdateJobSiteWasteStreamOrderDto } from './dto/update-job-sites-waste-streams-order.dto';
import { JobSitesWasteStreamsEntity } from './infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

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
@ApiTags('Job Sites Waste Streams')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'job-sites-waste-streams',
  version: '1',
})
export class JobSitesWasteStreamsController {
  constructor(
    private readonly jobSitesWasteStreamsService: JobSitesWasteStreamsService,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private readonly jobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
  ) {}

  @Get('bar-graph')
  getBarGraph(@Query() filterBarGraphDto: FilterBarGraphDto) {
    return this.jobSitesWasteStreamsService.getBarGraph(
      filterBarGraphDto.startDate,
      filterBarGraphDto.jobSiteId,
      filterBarGraphDto.endDate,
    );
  }

  @Get('bar-graph-by-client')
  getBarGraphByClient(
    @Query() filterBarGraphDto: FilterBarGraphDto,
    @Request() req,
  ) {
    const user = req.user;
    return this.jobSitesWasteStreamsService.getBarGraphByClient(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      filterBarGraphDto.clientId,
      user,
    );
  }

  @Get('bar-graph-by-jobsite')
  getBarGraphByJobSite(@Query() filterBarGraphDto: FilterBarGraphGroupDto) {
    return this.jobSitesWasteStreamsService.getBarGraphByJobSiteIds(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      filterBarGraphDto.jobSiteId,
    );
  }

  @Post('map-data')
  getMapData(@Body() filterMapDataDto: FilterMapDataDto, @Request() req) {
    return this.jobSitesWasteStreamsService.getMapDataForUser(
      req.user,
      filterMapDataDto.startDate,
      filterMapDataDto.endDate,
      filterMapDataDto.jobSiteId,
      filterMapDataDto.wasteType,
      filterMapDataDto.materialDestinations,
      false,
      filterMapDataDto.includeVerificationImages,
    );
  }

  @Post('map-data-stats')
  getMapDataStats(@Body() mapDataStatsDto: MapDataStatsDto, @Request() req) {
    return this.jobSitesWasteStreamsService.getMapDataStatsForUser(req.user, {
      startDate: mapDataStatsDto.startDate,
      endDate: mapDataStatsDto.endDate,
      jobSiteId: mapDataStatsDto.jobSiteId,
      wasteType: mapDataStatsDto.wasteType,
      materialDestinations: mapDataStatsDto.materialDestinations,
    });
  }

  @Get('tree-graph-stats')
  getTreeGraphStats(@Query() filterBarGraphDto: FilterBarGraphDto) {
    return this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      filterBarGraphDto.jobSiteId,
    );
  }

  @Get('tree-graph-diversion-stats')
  getTreeGraphDiversionStats(@Query() filterBarGraphDto: FilterBarGraphDto) {
    return this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      filterBarGraphDto.jobSiteId,
    );
  }

  @Get('tree-graph-waste-streams-type-stats')
  getTreeGraphWasteStreamsTypeStats(
    @Query() filterBarGraphDto: FilterBarGraphDto,
  ) {
    return this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      filterBarGraphDto.jobSiteId,
    );
  }

  @Get('tree-graph-wood-waste-diversion-stats')
  getTreeGraphWoodWasteDiversionStats(
    @Query() filterBarGraphDto: FilterBarGraphDto,
  ) {
    return this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(
      filterBarGraphDto.startDate,
      filterBarGraphDto.endDate,
      filterBarGraphDto.jobSiteId,
    );
  }

  @Patch('/:jobSiteId/update-order')
  updateOrder(
    @Param('jobSiteId') jobSiteId: number,
    @Body() updateJobSiteWasteStreamOrderDto: UpdateJobSiteWasteStreamOrderDto,
  ) {
    return this.jobSitesWasteStreamsService.updateWasteStreamsOrder(
      updateJobSiteWasteStreamOrderDto,
      jobSiteId,
    );
  }

  @Post()
  create(@Body() createJobSitesWasteStreamsDto: CreateJobSitesWasteStreamsDto) {
    return this.jobSitesWasteStreamsService.create(
      createJobSitesWasteStreamsDto,
    );
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @Body() updateJobSitesWasteStreamsDto: CreateJobSitesWasteStreamsDto,
  ) {
    return this.jobSitesWasteStreamsService.update(
      id,
      updateJobSitesWasteStreamsDto,
    );
  }

  @Get()
  findAll() {
    return this.jobSitesWasteStreamsService.findAll();
  }

  @Get('dumpster-type')
  getDumpsterType() {
    return Object.keys(DumpsterTypeEnum).map((key) => {
      const { dumpsterType, dumpsterKey, dumpsterWeight } =
        transformDumpsterType(key);
      const label = DumpsterTypeEnum[key as keyof typeof DumpsterTypeEnum];
      const value = label.split('_')[1]; // Split the label by underscore and take the second part
      return {
        key: key,
        label: value,
        dumpsterType,
        dumpsterKey,
        dumpsterWeight,
      };
    });
  }

  @Get('mobile-vessel-overview/:jobSiteId')
  findAllByJobSiteIdForMobile(@Param('jobSiteId') jobSiteId: number) {
    return this.jobSitesWasteStreamsService.findAllByJobSiteIdForMobile(jobSiteId);
  }

  @Get('findByJobSiteId/:jobSiteId')
  findByJobSiteId(@Param('jobSiteId') jobSiteId: number) {
    return this.jobSitesWasteStreamsService.findByJobSiteId(jobSiteId);
  }

  @Get('vessel-options-type')
  async getVesselOptionsType() {
    return this.jobSitesWasteStreamsService.getVesselOptionsType();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.jobSitesWasteStreamsService.findOne(id);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.jobSitesWasteStreamsService.delete(id);
  }

  @Post('migrateData')
  migrateData() {
    return this.jobSitesWasteStreamsService.migrateData();
  }
}
