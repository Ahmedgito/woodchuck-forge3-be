import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { EmissionFactorsService } from './emission-factors.service';
import { CreateEmissionFactorDto } from './dto/create-emission-factor.dto';
import { UpdateEmissionFactorDto } from './dto/update-emission-factor.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@ApiTags('Emission Factors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'emission-factors',
  version: '1',
})
export class EmissionFactorsController {
  constructor(
    private readonly emissionFactorsService: EmissionFactorsService,
  ) {}

  @Post()
  create(@Body() createEmissionFactorDto: CreateEmissionFactorDto) {
    return this.emissionFactorsService.create(createEmissionFactorDto);
  }

  @Get()
  findAll() {
    return this.emissionFactorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.emissionFactorsService.findOne(id);
  }

  @Get('key/:key')
  findByKey(@Param('key') key: string) {
    return this.emissionFactorsService.findByKey(key);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateEmissionFactorDto: UpdateEmissionFactorDto,
  ) {
    return this.emissionFactorsService.update(id, updateEmissionFactorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.emissionFactorsService.remove(id);
  }
}
