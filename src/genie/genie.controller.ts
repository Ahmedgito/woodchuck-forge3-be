import {
  Controller,
  Get,
  Param,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { GenieService, GeniePayload } from './genie.service';

@ApiBearerAuth()
@ApiTags('Genie')
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
  RoleEnum.cms,
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: [
    'admin',
    'general_contractor',
    'manufacturer',
    'wood_processing',
    'end_client',
    'power_plant',
  ],
})
@Controller({ path: 'genie', version: '1' })
export class GenieController {
  constructor(private readonly genieService: GenieService) {}

  @Get()
  findAll(): Promise<GeniePayload[]> {
    return this.genieService.findAll();
  }

  @Get(':value')
  @ApiParam({
    name: 'value',
    type: String,
    required: true,
  })
  findByValue(@Param('value') value: string): Promise<GeniePayload | null> {
    return this.genieService.findByValue(value);
  }
}
