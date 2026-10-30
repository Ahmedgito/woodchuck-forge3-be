import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CameraLiveViewService } from './camera-live-view.service';
import { UpdateCameraLiveViewDto } from './dto/update-camera-live-view.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Camera Live View')
/*
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin', 'general_contractor'],
})
*/
@Controller({
  path: 'camera-live-view',
  version: '1',
})
export class CameraLiveViewController {
  constructor(private readonly CameraLiveViewService: CameraLiveViewService) {}

  @Get('camera/:wasteStreamId')
  findByCameraId(
    @Param('wasteStreamId') wasteStreamId: number,
    @Query() query: { refresh: boolean },
  ) {
    const { refresh } = query;
    return this.CameraLiveViewService.findByCameraId(wasteStreamId, refresh);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.CameraLiveViewService.findOne(id);
  }

  @Post('cameraId/:wasteStreamId')
  update(
    @Param('wasteStreamId') wasteStreamId: number,
    @Body() updateCameraLiveViewDto: UpdateCameraLiveViewDto,
  ) {
    return this.CameraLiveViewService.update(
      wasteStreamId,
      updateCameraLiveViewDto.cameraIds,
      updateCameraLiveViewDto.cameraArr,
    );
  }
}
