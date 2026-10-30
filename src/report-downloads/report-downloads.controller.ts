import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SkipAll } from 'src/auth/skip-all.decorator';
import {
  REPORT_ARCHIVE_KEY_PREFIX,
  ReportS3StorageService,
} from './report-s3-storage.service';

@ApiTags('Report Downloads')
@Controller({
  path: 'report-downloads',
  version: '1',
})
export class ReportDownloadsController {
  constructor(private readonly reportS3Storage: ReportS3StorageService) {}

  /**
   * Public endpoint linked from report emails. Redirects to a freshly signed
   * S3 URL so the emailed link never expires while the object exists.
   */
  @SkipAll()
  @ApiExcludeEndpoint()
  @Get('file')
  async downloadReport(
    @Query('key') key: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!key || !key.startsWith(REPORT_ARCHIVE_KEY_PREFIX)) {
      throw new HttpException(
        'This download link is invalid. Please use the link from your most recent report email.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Links are permanent, but the underlying report file can be removed (manual
    // cleanup or an S3 lifecycle rule). Check first so an expired/missing report
    // shows a clear message instead of a raw S3 redirect error.
    const exists = await this.reportS3Storage.objectExists(key);
    if (!exists) {
      throw new HttpException(
        'This report is no longer available. The download link may have expired — please request a new report.',
        HttpStatus.GONE,
      );
    }

    const url = await this.reportS3Storage.getPresignedDownloadUrl(key);
    res.redirect(url);
  }
}
