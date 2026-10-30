import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DumpsterLiveViewService } from './dumpster-live-view.service';
import { UpdateDumpsterLiveViewDto } from './dto/update-dumpster-live-view.dto';
import { ApiTags } from '@nestjs/swagger';
// @Roles(RoleEnum.admin, RoleEnum.general_contractor)
@ApiTags('Dumpster Live View')
/*
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin', 'general_contractor'],
})
*/
@Controller({
  path: 'dumpster-live-view',
  version: '1',
})
export class DumpsterLiveViewController {
  constructor(
    private readonly dumpsterLiveViewService: DumpsterLiveViewService,
  ) {}

  /*
  @Post()
  create(@Body() createDumpsterLiveViewDto: CreateDumpsterLiveViewDto) {
    console.log(createDumpsterLiveViewDto);
    return this.dumpsterLiveViewService.create(createDumpsterLiveViewDto);
  }

  @Get()
  findAll() {
    return this.dumpsterLiveViewService.findAll();
  }
  */

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dumpsterLiveViewService.findOne(id);
  }

  @Get('jobSiteId/:jobSiteId')
  findByJobSiteId(@Param('jobSiteId') jobSiteId: string) {
    return this.dumpsterLiveViewService.findByJobSiteId(jobSiteId);
  }

  @Post(':jobSiteId/:gateId')
  update(
    @Param('jobSiteId') jobSiteId: string,
    @Param('gateId') gateId: string,
    @Body() updateDumpsterLiveViewDto: UpdateDumpsterLiveViewDto,
  ) {
    return this.dumpsterLiveViewService.update(
      jobSiteId,
      gateId,
      updateDumpsterLiveViewDto,
    );
  }

  /*
  @Patch(':jobSiteId/:gateId')
  updateByJobsiteLocationSize(
    @Param('jobSiteId') jobSiteId: string,
    @Param('dumpsterLocationId') dumpsterLocationId: string,
    @Param('dumpsterSize') dumpsterSize: string,
    @Body() updateDumpsterRefusedMmrDto: UpdateDumpsterRefusedMmrDto,
  ) {
    return this.dumpsterRefusedMmrService.updateByJobsiteLocationSize(
      jobSiteId,
      dumpsterLocationId,
      dumpsterSize,
      updateDumpsterRefusedMmrDto,
    );
  }
  */
}
