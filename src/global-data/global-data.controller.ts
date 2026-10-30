/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  SerializeOptions,
} from '@nestjs/common';
//   import { CreateJobSiteDto } from './dto/create-job-site.dto';
import { UpdateGlobalDataDto } from './dto/update-global-data.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
//   import { infinityPagination } from 'src/utils/infinity-pagination';
//   import { InfinityPaginationResultType } from '../utils/types/infinity-pagination-result.type';
import { NullableType } from '../utils/types/nullable.type';
//   import { QueryJobSiteDto } from './dto/query-job-site.dto';
import { GlobalData } from './domain/global-data';
import { GlobalDataService } from './global-data.service';
import { RolesGuard } from 'src/roles/roles.guard';

@ApiBearerAuth()
@Roles(RoleEnum.admin, RoleEnum.power_plant)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Global Data')
@Controller({
  path: 'global_data',
  version: '1',
})
export class GlobalDataController {
  constructor(private readonly globalDataService: GlobalDataService) {}

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(
    @Param('id') id: GlobalData['id'],
  ): Promise<NullableType<GlobalData>> {
    return this.globalDataService.findOne({ id });
  }

  @SerializeOptions({
    groups: ['admin', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(
    @Param('id') id: GlobalData['id'],
    @Body() updateGlobalDataDto: UpdateGlobalDataDto,
  ): Promise<GlobalData | null> {
    return this.globalDataService.update(id, updateGlobalDataDto);
  }
}
