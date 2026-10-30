import {
  Body,
  Controller,
  Get,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { VesselService } from './vessel.service';
import { SaveVesselDto } from './dto/save-vessel.dto';

@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Vessels')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({ path: 'vessels', version: '1' })
export class VesselController {
  constructor(private readonly vesselService: VesselService) {}

  @Get()
  findAll() {
    return this.vesselService.findAll();
  }

  @Post('save')
  saveVessel(@Body() dto: SaveVesselDto) {
    return this.vesselService.saveVessel(dto);
  }
}
