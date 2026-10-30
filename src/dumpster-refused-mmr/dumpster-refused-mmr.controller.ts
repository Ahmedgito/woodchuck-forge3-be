import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { DumpsterRefusedMmrService } from './dumpster-refused-mmr.service';
import { CreateDumpsterRefusedMmrDto } from './dto/create-dumpster-refused-mmr.dto';
import { UpdateDumpsterRefusedMmrDto } from './dto/update-dumpster-refused-mmr.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Dumpster Refused Mmr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
})
@Controller({
  path: 'dumpster-refused-mmr',
  version: '1',
})
export class DumpsterRefusedMmrController {
  constructor(
    private readonly dumpsterRefusedMmrService: DumpsterRefusedMmrService,
  ) {}

  @Post()
  create(@Body() createDumpsterRefusedMmrDto: CreateDumpsterRefusedMmrDto) {
    return this.dumpsterRefusedMmrService.create(createDumpsterRefusedMmrDto);
  }

  @Get()
  findAll() {
    return this.dumpsterRefusedMmrService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dumpsterRefusedMmrService.findOne(id);
  }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateDumpsterRefusedMmrDto: UpdateDumpsterRefusedMmrDto,
  // ) {
  //   return this.dumpsterRefusedMmrService.update(
  //     id,
  //     updateDumpsterRefusedMmrDto,
  //   );
  // }

  @Patch(':jobSiteId/:dumpsterLocationId/:dumpsterSize')
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
}
