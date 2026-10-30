import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobSitesCamerasEntity } from './infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { CreateJobSitesCamerasDto } from './dto/create-job-sites-cameras.dto';
import { JobSiteCameras } from './domain/job-sites-cameras';
import { JobSite } from 'src/job-sites/domain/job-site';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { Repository } from 'typeorm';
import { UpdateJobSiteCamerasDto } from './dto/update-job-sites-cameras.dto';
import { AlertToType } from './alertToType.enum';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { DumpsterLiveViewEntity } from 'src/dumpster-live-view/infrastructure/persistence/relational/entities/dumpster-live-view.entity';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class JobSitesCamerasService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(JobSitesCamerasEntity)
    private jobSitesCamerasRepository: Repository<JobSitesCamerasEntity>,
    @InjectRepository(JobSiteEntity)
    private readonly jobSitesRepository: Repository<JobSiteEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private readonly jobSiteWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(CameraEntity)
    private readonly cameraRepository: Repository<CameraEntity>,
    @InjectRepository(DumpsterLiveViewEntity)
    private readonly dumpsterLiveViewRepository: Repository<DumpsterLiveViewEntity>,
  ) {}

  async findOne(id: number) {
    return await this.jobSitesCamerasRepository.findOne({
      where: { id: id },
    });
  }

  async findByJobSiteId(jobSiteId: JobSite['id']) {
    const jobSite = await this.jobSitesCamerasRepository.find({
      where: { jobSite: { id: jobSiteId } },
      order: { id: 'ASC' },
    });

    return jobSite;
  }

  async createDumpsterLiveView(jobSiteId) {
    const clientJS = this.configService.get('CLIENT_CAMERA_JOBSITE', {
      infer: true,
    });
    const dumpsterLiveView = await this.dumpsterLiveViewRepository.findOne({
      where: { jobSite: { id: Number(clientJS) } },
      relations: ['jobSite'],
    });
    if (!dumpsterLiveView) {
      throw new NotFoundException(
        `DumpsterLiveView with jobsite ${clientJS} not found`,
      );
    }
    // Copy its data and update the job site ID
    const newDumpsterLiveView = this.dumpsterLiveViewRepository.create({
      s3ImageUrl: dumpsterLiveView.s3ImageUrl,
      fillPercentage: dumpsterLiveView.fillPercentage,
      gateId: dumpsterLiveView.gateId,
      jobSite: { id: jobSiteId },
    });
    await this.dumpsterLiveViewRepository.save(newDumpsterLiveView);
  }

  async removeDumpsterLiveView(jobSiteId) {
    const dumpsterLiveView = await this.dumpsterLiveViewRepository.findOne({
      where: { jobSite: { id: jobSiteId } },
      relations: ['jobSite'],
    });
    if (dumpsterLiveView) {
      await this.dumpsterLiveViewRepository.delete(dumpsterLiveView.id);
    }
  }

  async create(createDto: CreateJobSitesCamerasDto): Promise<JobSiteCameras> {
    try {
      const camera = await this.cameraRepository.findOne({
        where: { id: createDto.cameraId },
      });

      if (!camera) {
        throw new BadRequestException(
          `Camera with ID ${createDto.cameraId} not found`,
        );
      }

      if (camera.isAdmin) {
        await this.createDumpsterLiveView(createDto.jobSiteId);
      }

      const josbsiteCamera = this.jobSitesCamerasRepository.create({
        ...createDto,
        jobSite: { id: createDto.jobSiteId },
        camera: { id: createDto.cameraId },
      });
      return await this.jobSitesCamerasRepository.save(josbsiteCamera);
    } catch (exceptions) {
      console.log(exceptions);
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: number, updateDto: UpdateJobSiteCamerasDto) {
    try {
      // Fetch the old job site camera entry
      const oldJobSiteCamera = await this.jobSitesCamerasRepository.findOne({
        where: { id },
        relations: ['camera', 'jobSite'],
      });

      if (!oldJobSiteCamera) {
        throw new NotFoundException(`Job site camera with ID ${id} not found`);
      }

      // Fetch the old camera by cameraId
      const oldCamera = oldJobSiteCamera.camera;

      if (!oldCamera) {
        throw new BadRequestException(
          `Old camera with ID ${oldJobSiteCamera.camera.id} not found`,
        );
      }

      // Fetch the new camera by cameraId
      const newCamera = await this.cameraRepository.findOne({
        where: { id: updateDto.cameraId },
      });

      if (!newCamera) {
        throw new BadRequestException(
          `Camera with ID ${updateDto.cameraId} not found`,
        );
      }

      // Check if the old camera's isAdmin flag is true and delete data from dumpsterLiveView for this job site
      if (oldCamera.isAdmin) {
        await this.removeDumpsterLiveView(updateDto.jobSiteId);
      }

      // Check if the new camera's isAdmin flag is true and add data to dumpsterLiveView with a copy of client_camera_id
      if (newCamera.isAdmin) {
        await this.createDumpsterLiveView(updateDto.jobSiteId);
      }
      await this.jobSitesCamerasRepository.update({ id: id }, updateDto);
      const jobsiteCamera = this.findOne(id);
      return jobsiteCamera;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    // Fetch the job site camera entry by id
    const jobSiteCamera = await this.jobSitesCamerasRepository.findOne({
      where: { id },
      relations: ['camera', 'jobSite'],
    });

    if (!jobSiteCamera) {
      throw new NotFoundException(`Job site camera with ID ${id} not found`);
    }

    // Check if the associated camera has isAdmin set to true
    if (jobSiteCamera.camera.isAdmin) {
      await this.removeDumpsterLiveView(jobSiteCamera.jobSite.id);
    }

    const result = await this.jobSitesCamerasRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Job site camera with ID ${id} is not found`);
    }
  }

  async getAlertOptions(jobSiteId: JobSite['id']) {
    const jobSite = await this.jobSitesRepository.findOne({
      where: { id: jobSiteId },
      relations: { jobSitesWasteStreams: true },
    });

    if (!jobSite) {
      throw new Error(`Job site with ID:${jobSiteId} not found`);
    }

    const alertOptions: any = [];

    alertOptions.push({
      alertTo: jobSite.id,
      name: jobSite.name,
      alertToType: AlertToType.SUPERVISOR,
    });

    // Add haulers to alert options based on waste stream locations with type 1 or 2
    const uniqueHaulerIds = new Set();
    for (const wasteStream of jobSite.jobSitesWasteStreams) {
      // Fetch locations for this waste stream with type 1 or 2
      const wasteStreamWithLocations =
        await this.jobSiteWasteStreamsRepository.findOne({
          where: { id: wasteStream.id },
          relations: { wasteStreamLocations: { hauler: true } },
        });
      if (
        wasteStreamWithLocations &&
        wasteStreamWithLocations.wasteStreamLocations
      ) {
        for (const location of wasteStreamWithLocations.wasteStreamLocations) {
          if ((location.type === 1 || location.type === 2) && location.hauler) {
            if (!uniqueHaulerIds.has(location.hauler.id)) {
              uniqueHaulerIds.add(location.hauler.id);
              alertOptions.push({
                alertTo: location.hauler.id,
                name: location.hauler.name,
                alertToType: AlertToType.HAULER,
              });
            }
          }
        }
      }
    }

    return alertOptions;
  }
}
