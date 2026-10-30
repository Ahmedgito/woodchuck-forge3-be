import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesModule } from 'src/queues/queues.module';
import { ReportExportService } from './report-export.service';
import { ExportFormatsService } from './export-formats.service';
import { ReportExportController } from './report-export.controller';
import { ClientExcelReportService } from './client-excel-report.service';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { WasteStreamActivityMappingModule } from 'src/waste-stream-activity-mapping/waste-stream-activity-mapping.module';

@Module({
  imports: [
    forwardRef(() => QueuesModule),
    TypeOrmModule.forFeature([
      JobSiteEntity,
      JobSitesWasteStreamsEntity,
      JobSiteWastestreamsDumpstersEntity,
    ]),
    WasteStreamActivityMappingModule,
  ],
  controllers: [ReportExportController],
  providers: [
    ReportExportService,
    ExportFormatsService,
    ClientExcelReportService,
  ],
  exports: [
    ReportExportService,
    ExportFormatsService,
    ClientExcelReportService,
  ],
})
export class ReportExportModule {}
