import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CRON_EXPRESSIONS } from '../constants/cron.constants';
import { CameraLiveViewService } from 'src/camera-live-view/camera-live-view.service';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Injectable()
export class CameraLiveDataJobService {
  private readonly logger = new Logger(CameraLiveDataJobService.name);

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
    private readonly cameraLiveViewService: CameraLiveViewService,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private jobsiteWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
  ) {
    this.registerCronJobs();
  }

  private registerCronJobs() {
    const timezone = this.configService.get<string>('camera.timezone', {
      infer: true,
    });

    const createCronJob = (cronTime: string, onTick: () => Promise<void>) =>
      new CronJob(cronTime, onTick, null, true, timezone);

    const morningJob = createCronJob(
      CRON_EXPRESSIONS.EVERY_DAY_AT_08_10,
      async () => {
        await this.fetchCameraImage(true);
      },
    );

    const halfHourJob = createCronJob(
      CRON_EXPRESSIONS.EVERY_DAY_FROM_08_30_TO_17_30,
      async () => {
        await this.fetchCameraImage();
      },
    );

    const hourlyJob = createCronJob(
      CRON_EXPRESSIONS.EVERY_DAY_FROM_09_00_TO_17_00,
      async () => {
        await this.fetchCameraImage();
      },
    );

    // const testJob = createCronJob(
    //   CRON_EXPRESSIONS.TEST_CRON_EXPRESSION,
    //   async () => {
    //     await this.fetchCameraImage();
    //   },
    // );

    // Add the jobs to the registry
    this.schedulerRegistry.addCronJob('morning-job', morningJob as any); // adding as any since cron version in nestjs/schedule adn CronJob are conflciting
    this.schedulerRegistry.addCronJob('half-hour-job', halfHourJob as any);
    this.schedulerRegistry.addCronJob('hourly-job', hourlyJob as any);
    // this.schedulerRegistry.addCronJob('test-job', testJob as any);
  }

  private async fetchCameraImage(isMorningJob = false): Promise<void> {
    this.logger.log('------ Camera image fetch job started ------', new Date());
    let wsWithCameras: JobSitesWasteStreamsEntity[];

    try {
      const wasteStreams = await this.jobsiteWasteStreamsRepository.find({
        relations: ['wasteStreamCameras'],
      });

      // Filter only those that have camera records
      wsWithCameras = wasteStreams.filter((ws) => ws.wasteStreamCameras);
    } catch (error) {
      this.logger.error('Failed to fetch jobsite cameras:', error);
      return;
    }

    if (!wsWithCameras.length) {
      this.logger.warn('No jobsite cameras found for processing.');
      return;
    }

    // If it's the morning job, get polluted cameras before processing
    let previouslyPollutedCameraIds: string[] = [];
    if (isMorningJob) {
      previouslyPollutedCameraIds =
        await this.cameraLiveViewService.getPollutedCameraIds();
    }

    // Fetch live details for each unique cameraId (from both cameraId and additionalCameraId)
    const fetchTasks = wsWithCameras.map(({ id }) => {
      this.cameraLiveViewService.getCameraLiveDetails(id).catch((error) => {
        this.logger.error(
          `Failed to fetch live details for camera ${id}: ${error.message}`,
        );
      });
    });

    await Promise.allSettled(fetchTasks);

    // If it's the morning job, check for still-polluted cameras and send reminders
    if (isMorningJob && previouslyPollutedCameraIds.length > 0) {
      await this.cameraLiveViewService.checkAndSendPollutedReminders(
        previouslyPollutedCameraIds,
      );
    }

    this.logger.log(
      '------ Camera image fetch job completed ------',
      new Date(),
    );
  }
}
