import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { SmsDumpsterService } from './sms-dumpster.service';
import { UpdateSmsDumpsterDto } from './dto/update-sms-dumpster.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';

@Roles(RoleEnum.admin, RoleEnum.power_plant)
@ApiTags('Sms Dumpster')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'sms-dumpster',
  version: '1',
})
export class SmsDumpsterController {
  constructor(private readonly smsDumpsterService: SmsDumpsterService) {}

  // @Post()
  // create(@Body() createSmsDumpsterDto: CreateSmsDumpsterDto) {
  //   return this.smsDumpsterService.create(createSmsDumpsterDto);
  // }

  @Get()
  findAll() {
    return this.smsDumpsterService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.smsDumpsterService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSmsDumpsterDto: UpdateSmsDumpsterDto,
  ) {
    return this.smsDumpsterService.update(id, updateSmsDumpsterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.smsDumpsterService.remove(+id);
  }
}
