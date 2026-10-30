import { Module } from '@nestjs/common';
import { ReportDownloadsController } from './report-downloads.controller';
import { ReportS3StorageService } from './report-s3-storage.service';

@Module({
  controllers: [ReportDownloadsController],
  providers: [ReportS3StorageService],
  exports: [ReportS3StorageService],
})
export class ReportDownloadsModule {}
