import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CameraEntity } from './infrastructure/persistence/relational/entities/camera.entity';
import { Camera } from './domain/camera';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { CameraLiveViewEntity } from 'src/camera-live-view/infrastructure/persistence/relational/entities/camera-live-view.entity';

@Injectable()
export class CamerasService {
  constructor(
    @InjectRepository(CameraEntity)
    private cameraRepository: Repository<CameraEntity>,
    @InjectRepository(JobSitesCamerasEntity)
    private jobSiteCameraRepository: Repository<JobSitesCamerasEntity>,
    @InjectRepository(CameraLiveViewEntity)
    private cameraLiveViewRepository: Repository<CameraLiveViewEntity>,
  ) {}

  async create(createCameraDto: CreateCameraDto): Promise<Camera> {
    try {
      const existingCamera = await this.cameraRepository.findOne({
        where: { cameraId: createCameraDto.cameraId },
      });
      if (existingCamera) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              camera: 'idAlreadyExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      const camera = this.cameraRepository.create(createCameraDto);
      return await this.cameraRepository.save(camera);
    } catch (exceptions) {
      throw exceptions;
    }
  }

  async findAll() {
    const cameras = await this.cameraRepository.find({
      order: { updatedAt: 'desc' },
    });
    return cameras;
  }

  async findAllUnassociatedCameras() {
    const cameras = await this.cameraRepository
      .createQueryBuilder('camera')
      .leftJoin('wastestream_cameras', 'wsc1', 'camera.id = wsc1.cameraId')
      .leftJoin(
        'wastestream_cameras',
        'wsc2',
        'camera.id = wsc2.additionalCameraId',
      )
      .where('wsc1.cameraId IS NULL AND wsc2.additionalCameraId IS NULL')
      .orderBy('camera.updatedAt', 'DESC')
      .getMany();
    return cameras;
  }

  async findOne(id: number) {
    const camera = await this.cameraRepository.findOne({ where: { id: id } });
    if (!camera) {
      throw new NotFoundException(`Camera with id ${id} not found`);
    }
    return camera;
  }

  async update(id: number, updateCameraDto: UpdateCameraDto) {
    try {
      const existingCamera = await this.cameraRepository.findOne({
        where: { cameraId: updateCameraDto.cameraId },
      });

      if (existingCamera && existingCamera.id !== id) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              camera: 'idAlreadyExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      await this.cameraRepository.update({ id: id }, updateCameraDto);
      const camera = this.findOne(id);
      return camera;
    } catch (exceptions) {
      throw exceptions;
    }
  }

  async remove(id: number) {
    try {
      const jobSiteCamera = await this.jobSiteCameraRepository.findOne({
        where: { cameraId: id },
        relations: ['jobSite'],
      });
      if (jobSiteCamera) {
        const jobSite = jobSiteCamera.jobSite;
        const clientName = jobSite?.clientName;
        const jobSiteName = jobSite?.title;

        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              camera: 'cameraAssociated',
              clientName: clientName,
              jobName: jobSiteName,
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const camera = await this.cameraRepository.findOne({ where: { id } });
      if (camera) {
        await this.cameraLiveViewRepository.delete({
          cameraId: camera?.cameraId,
        });
      }
      const result = await this.cameraRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Camera with ID ${id} is not found`);
      }
    } catch (exceptions) {
      throw exceptions;
    }
  }
}
