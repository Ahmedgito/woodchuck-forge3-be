import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { RoleEnum } from 'src/roles/roles.enum';
import { WasteStreamImagesService } from './waste-stream-images.service';
import { CreateWasteStreamImageDto } from './dto/create-waste-stream-image.dto';
import { UpdateConfidenceDto } from './dto/update-confidence.dto';
import { WasteStreamImagesQueueService } from './waste-stream-images-queue.service';

@ApiBearerAuth()
@ApiTags('Waste Stream Images')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({ groups: ['admin'] })
@Controller({ path: 'waste-stream-images', version: '1' })
export class WasteStreamImagesController {
  private readonly logger = new Logger(WasteStreamImagesController.name);

  constructor(
    private readonly service: WasteStreamImagesService,
    private readonly queueService: WasteStreamImagesQueueService,
  ) {}

  @ApiOperation({ summary: 'List latest images for a waste stream assignment' })
  @Roles(
    RoleEnum.admin,
    RoleEnum.general_contractor,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.cms,
  )
  @Get('by-waste-stream/:jobsiteWasteStreamId')
  async findByWasteStream(
    @Param('jobsiteWasteStreamId', ParseIntPipe) id: number,
  ) {
    return this.service.findByJobsiteWasteStream(id);
  }

  @ApiOperation({
    summary: 'Upload a new image reference for a waste stream (max 4)',
  })
  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.cms)
  @Post()
  async create(@Body() dto: CreateWasteStreamImageDto, @Request() req: any) {
    const image = await this.service.create(dto, req.user.id);
    void this.queueService.enqueueAiAnalysis(image.id).catch((err) => {
      this.logger.error(
        `Failed to enqueue AI analysis for image ${image.id}: ${err?.message ?? err}`,
        err?.stack,
      );
    });
    return image;
  }

  @ApiOperation({
    summary:
      'Replace an existing image (creates new version, triggers new AI analysis)',
  })
  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.cms)
  @Post(':id/replace')
  async replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWasteStreamImageDto,
    @Request() req: any,
  ) {
    const image = await this.service.replace(id, dto, req.user.id);
    void this.queueService.enqueueAiAnalysis(image.id).catch((err) => {
      this.logger.error(
        `Failed to enqueue AI analysis for image ${image.id}: ${err?.message ?? err}`,
        err?.stack,
      );
    });
    return image;
  }

  @ApiOperation({ summary: 'Get AI processing status for an image' })
  @Roles(
    RoleEnum.admin,
    RoleEnum.general_contractor,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.cms,
  )
  @Get(':id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getStatus(id);
  }

  @ApiOperation({
    summary: 'Override confidence level for an image (admin only)',
  })
  @Roles(RoleEnum.admin)
  @Patch(':id/confidence')
  async updateConfidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConfidenceDto,
  ) {
    return this.service.updateConfidence(id, dto);
  }

  @ApiOperation({
    summary: 'Delete an image from a waste stream (record + storage)',
  })
  @Roles(RoleEnum.admin, RoleEnum.general_contractor, RoleEnum.cms)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.hardDelete(id);
    return { success: true };
  }
}
