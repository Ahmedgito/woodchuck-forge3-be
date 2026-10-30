import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReportLogEntity,
  ReportLogLevel,
} from './infrastructure/persistence/relational/entities/report-log.entity';

@Injectable()
export class ReportLoggerService {
  private readonly logger = new Logger(ReportLoggerService.name);

  constructor(
    @InjectRepository(ReportLogEntity)
    private readonly reportLogRepository: Repository<ReportLogEntity>,
  ) {}

  async log(
    message: string,
    context: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.log(message, context);
    await this.persist(ReportLogLevel.LOG, context, message, metadata);
  }

  async warn(
    message: string,
    context: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.warn(message, context);
    await this.persist(ReportLogLevel.WARN, context, message, metadata);
  }

  async error(
    message: string,
    context: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.error(message, context);
    await this.persist(ReportLogLevel.ERROR, context, message, metadata);
  }

  private async persist(
    level: ReportLogLevel,
    context: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const entry = this.reportLogRepository.create({
        level,
        context,
        message,
        metadata: metadata ?? null,
      });
      await this.reportLogRepository.save(entry);
    } catch (err) {
      this.logger.error(`Failed to persist report log: ${err.message}`);
    }
  }
}
