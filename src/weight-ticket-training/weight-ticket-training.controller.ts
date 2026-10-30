import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { WeightTicketTrainingService } from './weight-ticket-training.service';

@ApiBearerAuth()
@ApiTags('Weight Ticket Training')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'weight-ticket-training', version: '1' })
export class WeightTicketTrainingController {
  constructor(
    private readonly weightTicketTrainingService: WeightTicketTrainingService,
  ) {}

  // Untrained weight ticket images/PDFs for the AI team — no material type or
  // waste stream context needed, just drop the raw file in S3 for later review.
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|heic|heif|pdf)$/i)) {
          return cb(
            new HttpException(
              {
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                errors: { file: 'cantUploadFileType' },
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    const count = await this.weightTicketTrainingService.uploadFiles(files);
    return {
      message: `${count} file${count !== 1 ? 's' : ''} uploaded successfully for training.`,
      count,
    };
  }
}
