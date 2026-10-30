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
import { HaulersService } from './haulers.service';
import { CreateHaulerDto } from './dto/create-hauler.dto';
import { UpdateHaulerDto } from './dto/update-hauler.dto';
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
@ApiTags('Haulers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'haulers',
  version: '1',
})
export class HaulersController {
  constructor(private readonly haulersService: HaulersService) {}
  @Post()
  create(@Body() createHaulerDto: CreateHaulerDto) {
    return this.haulersService.create(createHaulerDto);
  }
  @Get()
  findAll() {
    return this.haulersService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.haulersService.findOne(id);
  }
  @Patch(':id')
  update(@Param('id') id: number, @Body() updateHaulerDto: UpdateHaulerDto) {
    return this.haulersService.update(id, updateHaulerDto);
  }
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.haulersService.remove(+id);
  // }
}
