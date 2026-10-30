import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportLogEntity } from './infrastructure/persistence/relational/entities/report-log.entity';
import { ReportLoggerService } from './report-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReportLogEntity])],
  providers: [ReportLoggerService],
  exports: [ReportLoggerService],
})
export class ReportLoggerModule {}
