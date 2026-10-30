import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';

import { JobSitesCamerasService } from './job-sites-cameras.service';
import { RolesGuard } from 'src/roles/roles.guard';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { CreateJobSitesCamerasDto } from './dto/create-job-sites-cameras.dto';
import { UpdateJobSiteCamerasDto } from './dto/update-job-sites-cameras.dto';
import { JobSiteCameras } from './domain/job-sites-cameras';

@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Job Sites Cameras')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'job-sites-cameras',
  version: '1',
})
export class JobSitesCamerasController {
  constructor(
    private readonly jobSitesCamerasService: JobSitesCamerasService,
  ) {}

  @Get('findByJobSiteId/:jobSiteId')
  findByJobSiteId(@Param('jobSiteId') jobSiteId: number) {
    return this.jobSitesCamerasService.findByJobSiteId(jobSiteId);
  }

  @Get('/:jobSiteId/alert-options')
  getAlertOptions(@Param('jobSiteId') jobSiteId: number) {
    return this.jobSitesCamerasService.getAlertOptions(jobSiteId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.jobSitesCamerasService.findOne(id);
  }

  @Post()
  create(@Body() createJobSitesWasteStreamsDto: CreateJobSitesCamerasDto) {
    return this.jobSitesCamerasService.create(createJobSitesWasteStreamsDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateJobSitesWasteStreamsDto: UpdateJobSiteCamerasDto,
  ) {
    return this.jobSitesCamerasService.update(
      id,
      updateJobSitesWasteStreamsDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: JobSiteCameras['id']) {
    return this.jobSitesCamerasService.remove(id);
  }
}
