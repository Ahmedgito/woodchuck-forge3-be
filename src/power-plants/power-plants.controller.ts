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
import { PowerPlantsService } from './power-plants.service';
import { CreatePowerPlantsDto } from './dto/create-power-plants.dto';
import { UpdatePowerPlantsDto } from './dto/update-power-plants.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/roles/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';

@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Power Plants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'powerplants',
  version: '1',
})
export class PowerPlantsController {
  constructor(private readonly powerPlantsService: PowerPlantsService) {}

  @Post()
  create(@Body() createPowerPlantsDto: CreatePowerPlantsDto) {
    return this.powerPlantsService.create(createPowerPlantsDto);
  }

  @Get()
  findAll() {
    return this.powerPlantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.powerPlantsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updatePowerPlantsDto: UpdatePowerPlantsDto,
  ) {
    return this.powerPlantsService.update(id, updatePowerPlantsDto);
  }
}
