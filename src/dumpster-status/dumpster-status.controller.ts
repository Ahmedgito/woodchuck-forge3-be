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
import { DumpsterStatusService } from './dumpster-status.service';
import { CreateDumpsterStatusDto } from './dto/create-dumpster-status.dto';
import { UpdateDumpsterStatusDto } from './dto/update-dumpster-status.dto';
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
@ApiTags('Dumpster Status')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
})
@Controller({
  path: 'dumpster-status',
  version: '1',
})
export class DumpsterStatusController {
  constructor(private readonly dumpsterStatusService: DumpsterStatusService) {}

  @Post()
  create(@Body() createDumpsterStatusDto: CreateDumpsterStatusDto) {
    return this.dumpsterStatusService.create(createDumpsterStatusDto);
  }

  @Get()
  findAll() {
    return this.dumpsterStatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dumpsterStatusService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDumpsterStatusDto: UpdateDumpsterStatusDto,
  ) {
    return this.dumpsterStatusService.update(id, updateDumpsterStatusDto);
  }
}
