import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JobSitesWastestreamsDumpstersService } from '../../job-sites-wastestreams-dumpsters/job-sites-wastestreams-dumpsters.service';
import { JobSitesWasteStreamsEntity } from '../../job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CRON_EXPRESSIONS } from '../constants/cron.constants';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';

@Injectable()
export class DemoJobService {
  private readonly logger = new Logger(DemoJobService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jobSitesWastestreamsDumpstersService: JobSitesWastestreamsDumpstersService,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private readonly jobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(JobSiteEntity)
    private readonly jobSitesRepository: Repository<JobSiteEntity>,
    @InjectRepository(JobSiteWastestreamsDumpstersEntity)
    private readonly jobSiteWastestreamsDumpstersRepository: Repository<JobSiteWastestreamsDumpstersEntity>,
  ) {}

  @Cron(CRON_EXPRESSIONS.EVERY_1ST_DAY_OF_MONTH_AT_00_15)
  async updateMonthlyDumpsterStats() {
    if (process.env.IS_DEMO !== 'true') {
      this.logger.log(
        'Skipping updateMonthlyDumpsterStats job as DEMO mode is not enabled',
      );
      return;
    }

    this.logger.log('Running monthly job to update dumpster counts');

    try {
      // ========================================================================
      // NEW: Current month parity check
      // Previous code: No month-based filtering
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JS months are 0-indexed
      const isEvenMonth = currentMonth % 2 === 0;
      // ========================================================================

      // ========================================================================
      // NEW: Configurable random range implementation
      // Previous code: Fixed 10% increase calculation
      // Previous code:
      // const MAX_DUMPSTERS = this.configService.get<number>('MAX_NO_OF_WASTESTREAMS_DUMPSTERS') ?? 0;
      const configMin =
        this.configService.get<number>('CRON_MIN_DUMPSTER_VALUE', {
          infer: true,
        }) ?? 1;
      const configMax =
        this.configService.get<number>('CRON_MAX_DUMPSTER_VALUE', {
          infer: true,
        }) ?? 5;
      const [min, max] = [
        Math.min(configMin, configMax),
        Math.max(configMin, configMax),
      ];
      // ========================================================================

      // ========================================================================
      // NEW: Database-level parity filtering using TypeORM Raw
      // Previous code: Fetch all job sites without filtering
      // Previous code:
      // const jobSites = await this.jobSitesWasteStreamsRepository.find({
      //   relations: ['jobSitesWasteStreamsDumpsters'],
      // });
      const jobSites = await this.jobSitesWasteStreamsRepository.find({
        relations: ['jobSitesWasteStreamsDumpsters'],
        where: {
          id: Raw((alias) => `${alias} % 2 = :parity`, {
            parity: isEvenMonth ? 0 : 1,
          }),
        },
      });
      // ========================================================================

      this.logger.log(`Processing ${jobSites.length} matching job sites`);

      // NEW: Check if there are no job sites to process
      if (jobSites.length === 0) {
        this.logger.log('No job sites found to process.');
        return; // Exit the function early if there are no job sites
      }

      for (const jobSite of jobSites) {
        try {
          // ====================================================================
          // NEW: Random dumpster count generation
          // Previous code: Percentage-based calculation
          // Previous code:
          // const currentDumpsterCount = jobSite.jobSitesWasteStreamsDumpsters?.length ?? 0;
          // const potentialNewCount = Math.ceil(currentDumpsterCount * 1.1);
          // let dumpstersToAdd = potentialNewCount - currentDumpsterCount;
          const dumpstersToAdd =
            Math.floor(Math.random() * (max - min + 1)) + min;
          // ====================================================================

          // ====================================================================
          // REMOVED: Maximum capacity check
          // Previous code:
          // if (currentDumpsterCount + dumpstersToAdd > MAX_DUMPSTERS) {
          //   dumpstersToAdd = MAX_DUMPSTERS - currentDumpsterCount;
          //   if (dumpstersToAdd <= 0) continue;
          // }
          // ====================================================================

          // if (dumpstersToAdd > 0) {
          //   this.logger.log(
          //     `Updating job site ${jobSite.id}: Adding ${dumpstersToAdd} dumpsters (range ${min}-${max})`
          //   );

          await this.jobSitesWastestreamsDumpstersService.create({
            jobSiteWastestreamsId: jobSite.id,
            no_of_dumpster: dumpstersToAdd,
            creationDate: currentDate,
          });
          //  }
        } catch (error) {
          this.logger.error(
            `Failed to update job site ${jobSite.id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Monthly job completed with successes');
    } catch (error) {
      this.logger.error('Critical error in monthly job:', error);
    }
  }

  @Cron(CRON_EXPRESSIONS.EVERY_1ST_DAY_OF_YEAR_AT_00_00)
  async updateJobSitesStartDate() {
    if (process.env.IS_DEMO !== 'true') {
      this.logger.log(
        'Skipping updateJobSitesStartDate job as DEMO mode is not enabled',
      );
      return;
    }
    this.logger.log('Running yearly job to update job sites start date');

    try {
      const dumpsters =
        await this.jobSiteWastestreamsDumpstersRepository.find();

      for (const dumpster of dumpsters) {
        await this.jobSitesWastestreamsDumpstersService.delete(dumpster.id);
      }

      const currentDate = new Date();
      await this.jobSitesRepository.update({}, { startDate: currentDate });

      this.logger.log('Yearly job completed successfully');
    } catch (error) {
      this.logger.error('Error in yearly job:', error);
    }
  }
}
