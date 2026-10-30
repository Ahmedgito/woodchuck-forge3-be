import { Injectable } from '@nestjs/common';
import { QueuesService } from 'src/queues/queues.service';
import { ReportJobData } from 'src/queues/consumers/ReportGeneration.consumer';

@Injectable()
export class ReportExportService {
  constructor(private readonly queuesService: QueuesService) {}

  /**
   * Enqueue a report export job and return jobId
   */
  async exportReport(
    jobConfig: Omit<ReportJobData, 'type'> & {
      type: 'job-site' | 'dashboard';
    },
  ): Promise<{ jobId: string | number }> {
    const job = await this.queuesService.generateReport({
      ...jobConfig,
    });
    return { jobId: job.id };
  }

  /**
   * Get export job status with ownership validation
   */
  async getExportStatus(
    jobId: string | number,
    userId: number,
  ): Promise<{ state: string; progress: number }> {
    const job = await this.queuesService.getReportJob(jobId);
    if (!job) {
      return { state: 'not_found', progress: 0 };
    }
    const jobData = (job as any).data || {};
    if (jobData?.user?.id && jobData.user.id !== userId) {
      return { state: 'forbidden', progress: 0 };
    }
    const status = await this.queuesService.getReportJobStatus(jobId);
    return status;
  }

  /**
   * Get export job result (ZIP file info) with ownership validation
   */
  async getExportZip(
    jobId: string | number,
    userId: number,
  ): Promise<{
    zip: { filename: string; path: string };
    artifacts?: string[];
  } | null> {
    const job = await this.queuesService.getReportJob(jobId);
    if (!job) {
      return null;
    }
    const jobData = (job as any).data || {};
    if (jobData?.user?.id && jobData.user.id !== userId) {
      return null;
    }
    const result = await this.queuesService.getReportJobResult(jobId);
    return result;
  }
}
