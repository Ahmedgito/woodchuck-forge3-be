import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { CreateLocationsDto } from './dto/create-locations.dto';
import { UpdateLocationsDto } from './dto/update-locations.dto';
import { LocationsTypeEnum } from './locationTypes.enum';
import { LocationsToTypesEnum } from './locationToTypes.enum';

@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Locations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'locations',
  version: '1',
})
export class LocationsController {
  // location service injection
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  create(@Body() createLocationsDto: CreateLocationsDto) {
    return this.locationsService.create(createLocationsDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateLocationsDto: UpdateLocationsDto,
  ) {
    return this.locationsService.update(id, updateLocationsDto);
  }

  @Get()
  findAll() {
    return this.locationsService.findAll();
  }

  @Get('get-combined-list')
  getCombinedList() {
    return this.locationsService.getCombinedList();
  }

  @Get('location-types')
  getLocationTypes() {
    const listItems = Object.keys(LocationsTypeEnum)
      .filter((key) => !isNaN(Number(LocationsTypeEnum[key])))
      .map((key) => ({
        id: LocationsTypeEnum[key as keyof typeof LocationsTypeEnum],
        // value: LocationsTypeEnum[key as keyof typeof LocationsTypeEnum],
        label: key,
      }));

    return listItems;
  }

  @Get('location-to-types')
  getLocationToTypes() {
    const listItems = Object.keys(LocationsToTypesEnum)
      .filter((key) => !isNaN(Number(LocationsToTypesEnum[key])))
      .map((key) => ({
        id: LocationsToTypesEnum[key as keyof typeof LocationsToTypesEnum],
        // value: LocationsToTypesEnum[key as keyof typeof LocationsToTypesEnum],
        label: key,
      }));

    return listItems;
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.locationsService.findOne(id);
  }
}
