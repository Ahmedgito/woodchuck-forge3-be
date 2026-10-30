import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@Processor('add-JobsiteWastestreamsDumpsters')
export class AddJobsiteWastestreamsDumpstersConsumers {
  private readonly logger = new Logger(
    AddJobsiteWastestreamsDumpstersConsumers.name,
  );

  constructor(
    @InjectRepository(JobSiteWastestreamsDumpstersEntity)
    private JobSiteWastestreamsDumpstersRepository: Repository<JobSiteWastestreamsDumpstersEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private JobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
  ) {}

  @Process('addJobsiteWastestreamsDumpsters-job')
  async addJobsiteWastestreamsDumpstersReq(
    job: Job<{
      creationDate: string;
      jobSiteWastestreams: { id: number };
      real_weight?: number;
    }>,
  ) {
    try {
      const jobDt = job.data;
      const jobsiteWastestreamsId = jobDt.jobSiteWastestreams.id;

      const jobSiteWastestreams =
        await this.JobSitesWasteStreamsRepository.findOne({
          where: { id: jobsiteWastestreamsId },
        });

      if (!jobSiteWastestreams) {
        throw new Error(
          `JobSiteWastestreams ${jobsiteWastestreamsId} not found`,
        );
      }

      const est_weight = jobSiteWastestreams.calculateEstWeight();

      await this.JobSiteWastestreamsDumpstersRepository.save(
        this.JobSiteWastestreamsDumpstersRepository.create({
          creationDate: jobDt.creationDate,
          estimated_weight: est_weight,
          real_weight: jobDt.real_weight,
          jobSiteWastestreams: { id: jobSiteWastestreams.id },
        }),
      );

      this.logger.log(`Dumpster added for job site ${jobsiteWastestreamsId}`);
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}:`, error);
      throw error; // Ensure failed jobs are retried
    }
  }

  @Process('updateJobsiteWastestreamsDumpsters-job')
  async updateJobsiteWastestreamsDumpstersReq(job: Job) {
    const jobDt = job.data;
    const jobSiteWastestreamsDumpstersId =
      jobDt.jobSiteWastestreamsDumpsters.id;

    await this.JobSiteWastestreamsDumpstersRepository.update(
      { id: jobSiteWastestreamsDumpstersId },
      {
        real_weight: jobDt.real_weight,
      },
    );
  }

  @Process('deleteJobsiteWastestreamsDumpsters-job')
  async deleteJobsiteWastestreamsDumpstersReq(job: Job) {
    const jobDt = job.data;
    const jobSiteWastestreamsDumpstersId =
      jobDt.jobSiteWastestreamsDumpsters.id;

    await this.JobSiteWastestreamsDumpstersRepository.delete({
      id: jobSiteWastestreamsDumpstersId,
    });
  }

  @Process('updateAllJobSiteWastestreamsDumpsterEstValue-job')
  async updateAllJobSiteWastestreamsDumpsterEstValue(job: Job) {
    const jobDt = job.data;
    const wasteStreamTypeId = jobDt.wasteStreamTypeId;
    const vesselId = jobDt.vesselId;

    const jobSitesWasteStreamsDumpstersData =
      await this.JobSiteWastestreamsDumpstersRepository.find({
        where: {
          jobSiteWastestreams: {
            vessel: { id: vesselId },
            wasteStreamType: { id: wasteStreamTypeId },
          },
        },
        withDeleted: true, // Include soft-deleted records
      });

    jobSitesWasteStreamsDumpstersData.forEach(async (value) => {
      const est_weight = value.jobSiteWastestreams.calculateEstWeight();
      await this.JobSiteWastestreamsDumpstersRepository.update(
        { id: value.id },
        {
          estimated_weight: est_weight,
        },
      );
    });
  }
}
