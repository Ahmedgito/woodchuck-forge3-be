import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  SerializeOptions,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { WeightTicketsService } from './weight-tickets.service';
import { ApplyTicketDto } from './dto/apply-ticket.dto';

// Plain shape (no class) so the global ValidationPipe doesn't try to run
// ProcessTicketDto validation against the multipart body.
type ProcessTicketBody = {
  fileId?: unknown;
  wasteStreamId?: unknown;
  materialType?: unknown;
};

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@ApiTags('Weight Tickets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({ groups: ['admin'] })
@Controller({ path: 'weight-tickets', version: '1' })
export class WeightTicketsController {
  constructor(private readonly weightTicketsService: WeightTicketsService) {}

  // Single endpoint, two shapes — branched by Content-Type:
  //   • application/json       → legacy { fileId } body
  //   • multipart/form-data    → file + wasteStreamId + materialType
  @Post('process')
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: { fileId: { type: 'string' } },
          required: ['fileId'],
        },
        {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
            wasteStreamId: { type: 'string' },
            materialType: { type: 'string' },
          },
          required: ['file', 'wasteStreamId', 'materialType'],
        },
      ],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  processTicket(
    @Headers('content-type') contentType: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ProcessTicketBody,
  ) {
    const isMultipart = (contentType ?? '')
      .toLowerCase()
      .includes('multipart/form-data');

    if (isMultipart || file) {
      const wasteStreamId = Number(body?.wasteStreamId);
      const materialType =
        typeof body?.materialType === 'string' ? body.materialType : '';
      return this.weightTicketsService.processTicketWithUpload(
        file,
        wasteStreamId,
        materialType,
      );
    }

    const fileId = body?.fileId;
    if (typeof fileId !== 'string' || !fileId) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { fileId: 'required' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return this.weightTicketsService.processTicket(fileId);
  }

  @Post('apply')
  applyTicket(@Body() dto: ApplyTicketDto) {
    return this.weightTicketsService.applyTicket(dto);
  }
}
