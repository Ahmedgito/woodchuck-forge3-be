import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { WastestreamsService } from './wastestreams.service';
import { UpdateWasteStreamsDto } from './dto/update-wastestreams.dto';

@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@ApiTags('Waste Streams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({ path: 'wastestreams', version: '1' })
export class WastestreamsController {
  constructor(private readonly wasteStreamService: WastestreamsService) {}
  // @Post()
  // create(@Body() createWasteStreamsDto: CreateWasteStreamsDto) {
  //   return this.wasteStreamService.create(createWasteStreamsDto);
  // }
  @Get()
  findAll() {
    return this.wasteStreamService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.wasteStreamService.findOne(id);
  }
  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateWasteStreamsDto: UpdateWasteStreamsDto,
  ) {
    return this.wasteStreamService.update(id, updateWasteStreamsDto);
  }
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.haulersService.remove(+id);
  // }
}
