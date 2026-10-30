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
import { SmsDumpService } from './sms-dump.service';
import { CreateSmsDumpDto } from './dto/create-sms-dump.dto';
import { UpdateSmsDumpDto } from './dto/update-sms-dump.dto';
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
@ApiTags('Sms Dump')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
})
@Controller({
  path: 'sms-dump',
  version: '1',
})
export class SmsDumpController {
  constructor(private readonly smsDumpService: SmsDumpService) {}

  @Post()
  create(@Body() createSmsDumpDto: CreateSmsDumpDto) {
    return this.smsDumpService.create(createSmsDumpDto);
  }

  @Get()
  findAll() {
    return this.smsDumpService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.smsDumpService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSmsDumpDto: UpdateSmsDumpDto) {
    return this.smsDumpService.update(id, updateSmsDumpDto);
  }
}
