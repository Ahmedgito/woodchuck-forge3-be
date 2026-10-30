import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { CamerasService } from './cameras.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { Camera } from './domain/camera';

@ApiBearerAuth()
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Cameras')
@Controller({
  path: 'cameras',
  version: '1',
})
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() cameraCameraDto: CreateCameraDto) {
    return this.camerasService.create(cameraCameraDto);
  }

  @Get('unassociated')
  findUnassociatedCameras() {
    return this.camerasService.findAllUnassociatedCameras();
  }

  @Get()
  findAll() {
    return this.camerasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.camerasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateCameraDto: UpdateCameraDto) {
    return this.camerasService.update(id, updateCameraDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: Camera['id']) {
    return this.camerasService.remove(id);
  }
}
