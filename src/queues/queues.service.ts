import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ReportJobData } from './consumers/ReportGeneration.consumer';

@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue('sms-dumpster-request') private smsDumpsterReq: Queue,
    @InjectQueue('global-data-update') private globalDataUpdateReq: Queue,
    @InjectQueue('add-JobsiteWastestreamsDumpsters')
    private addJobsiteWastestreamsDumpstersReq: Queue,
    @InjectQueue('report-generation') private reportGenerationReq: Queue,
  ) {}

  async smsDumpsterRequest(data: any) {
    await this.smsDumpsterReq.add('smsDumpsterReq-job', data, {
      attempts: 3,
    });
    //console.log(job);
  }

  async globalDataUpdate(data: any) {
    await this.globalDataUpdateReq.add('globalDataUpdate-job', data, {
      attempts: 3,
    });
    //console.log(job);
  }

  async addJobsiteWastestreamsDumpsters(data: any) {
    const job = await this.addJobsiteWastestreamsDumpstersReq.add(
      'addJobsiteWastestreamsDumpsters-job',
      data,
      {
        attempts: 3,
      },
    );
    console.log(job);
  }

  async updateJobsiteWastestreamsDumpsters(data: any) {
    const job = await this.addJobsiteWastestreamsDumpstersReq.add(
      'updateJobsiteWastestreamsDumpsters-job',
      data,
      {
        attempts: 3,
      },
    );
    console.log(job);
  }

  async deleteJobsiteWastestreamsDumpsters(data: any) {
    const job = await this.addJobsiteWastestreamsDumpstersReq.add(
      'deleteJobsiteWastestreamsDumpsters-job',
      data,
      {
        attempts: 3,
      },
    );
    console.log(job);
  }

  async updateAllJobSiteWastestreamsDumpsterEstValue(data: any) {
    const job = await this.addJobsiteWastestreamsDumpstersReq.add(
      'updateAllJobSiteWastestreamsDumpsterEstValue-job',
      data,
      {
        attempts: 3,
      },
    );
    console.log(job);
  }

  async generateReport(data: ReportJobData) {
    const job = await this.reportGenerationReq.add(
      'generate-report-job',
      data,
      {
        attempts: 3,
        timeout: 600000, // 10-minute hard cap per attempt — frees the worker slot if Puppeteer hangs
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
    console.log(`Report generation job queued: ${job.id}`);
    return job;
  }

  async getReportJob(jobId: string | number) {
    return this.reportGenerationReq.getJob(jobId);
  }

  async getReportJobStatus(jobId: string | number) {
    const job = await this.getReportJob(jobId);
    if (!job) return { state: 'not_found', progress: 0 } as any;
    const state = await job.getState();
    const progress = (job as any).progress || 0;
    return { state, progress };
  }

  async getReportJobResult(jobId: string | number) {
    const job = await this.getReportJob(jobId);
    if (!job) return null;
    // If completed, Bull stores returnvalue on job
    const state = await job.getState();
    if (state === 'completed') {
      return (job as any).returnvalue;
    }
    return null;
  }
}
