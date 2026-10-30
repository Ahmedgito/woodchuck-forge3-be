import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobSitesWastestreamsDumpstersService } from './job-sites-wastestreams-dumpsters.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { UpdateJobSitesWastestreamsDumpstersDto } from './dto/update-job-sites-wastestreams-dumpsters.dto';
import { CreateJobSitesWastestreamsDumpstersDto } from './dto/create-job-sites-wastestreams-dumpsters.dto';
import { BulkCreateJobSitesWastestreamsDumpstersDto } from './dto/bulk-create-job-sites-wastestreams-dumpsters.dto';
import { BulkCreateJobSitesWastestreamsDumpstersResponseDto } from './dto/bulk-create-response.dto';
import { BulkDeleteJobSitesWastestreamsDumpstersDto } from './dto/bulk-delete-job-sites-wastestreams-dumpsters.dto';
import { BulkDeleteJobSitesWastestreamsDumpstersResponseDto } from './dto/bulk-delete-response.dto';

@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Job Sites Waste Streams Dumpsters')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({ path: 'job-sites-wastestreams-dumpsters', version: '1' })
export class JobSitesWastestreamsDumpstersController {
  constructor(
    private readonly jobSitesWastestreamsDumpsterService: JobSitesWastestreamsDumpstersService,
  ) {}

  @Post()
  create(@Body() createDto: CreateJobSitesWastestreamsDumpstersDto) {
    return this.jobSitesWastestreamsDumpsterService.create(createDto);
  }

  @Post('bulk-create')
  @ApiOperation({
    summary: 'Bulk create multiple dumpsters',
    description:
      'Create multiple dumpsters in a single request. Returns results for each item including success/failure status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk creation completed',
    type: BulkCreateJobSitesWastestreamsDumpstersResponseDto,
  })
  bulkCreate(
    @Body() bulkCreateDto: BulkCreateJobSitesWastestreamsDumpstersDto,
  ): Promise<BulkCreateJobSitesWastestreamsDumpstersResponseDto> {
    return this.jobSitesWastestreamsDumpsterService.bulkCreate(bulkCreateDto);
  }
  // @Get()
  // findAll() {
  //   return this.jobSitesWastestreamsDumpsterService.findAll();
  // }
  // @Get(':id')
  // findOne(@Param('id') id: number) {
  //   return this.jobSitesWastestreamsDumpsterService.findOne(id);
  // }
  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateDto: UpdateJobSitesWastestreamsDumpstersDto,
  ) {
    return this.jobSitesWastestreamsDumpsterService.update(id, updateDto);
  }

  @Delete('bulk-delete')
  @ApiOperation({
    summary: 'Bulk delete multiple dumpsters',
    description:
      'Delete multiple dumpsters by their IDs in a single request. Returns results for each item including success/failure status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk deletion completed',
    type: BulkDeleteJobSitesWastestreamsDumpstersResponseDto,
  })
  bulkDelete(
    @Body() bulkDeleteDto: BulkDeleteJobSitesWastestreamsDumpstersDto,
  ): Promise<BulkDeleteJobSitesWastestreamsDumpstersResponseDto> {
    return this.jobSitesWastestreamsDumpsterService.bulkDelete(bulkDeleteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.jobSitesWastestreamsDumpsterService.delete(id);
  }
}
