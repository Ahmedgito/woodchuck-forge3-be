import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { SkipAll } from 'src/auth/skip-all.decorator';
import { AiTrainingService } from './ai-training.service';
import { VALID_FOLDER_NAMES } from './ai-training.constants';

@ApiTags('AI Training')
@SkipAll()
@Controller({ path: 'ai-training', version: '1' })
export class AiTrainingController {
  constructor(private readonly aiTrainingService: AiTrainingService) {}

  @Get('folders')
  async getFolders() {
    return this.aiTrainingService.getFolderCounts();
  }

  @Post('upload/:folderName')
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
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
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
  async uploadImages(
    @Param('folderName') folderName: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!VALID_FOLDER_NAMES.includes(folderName)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: { folderName: 'Invalid wood type folder' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const count = await this.aiTrainingService.uploadImages(folderName, files);
    return {
      message: `${count} image${count !== 1 ? 's' : ''} uploaded successfully for training.`,
      count,
    };
  }
}
