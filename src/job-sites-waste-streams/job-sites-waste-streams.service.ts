import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobSitesWasteStreamsEntity } from './infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { Between, In, MoreThan, Repository, Not, IsNull } from 'typeorm';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateJobSitesWasteStreamsDto } from './dto/create-job-sites-waste-streams.dto';
import { JobSiteWasteStreams } from './domain/job-sites-waste-streams';
// import { UpdateJobSitWasteStreamsDto } from './dto/update-job-sites-waste-streams.dto';
import { JobSite } from 'src/job-sites/domain/job-site';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSiteMapper } from 'src/job-sites/infrastructure/persistence/relational/mappers/job-site.mapper';
import { format } from 'date-fns'; // Import date-fns for date manipulation
import { JobSiteStats } from './utils/job-sites-stats';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { transformVesselOptionType } from 'src/utils/transformers/dumpster-type.transformer';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
// import { AlertToType } from 'src/job-sites-cameras/alertToType.enum';
import { RoleEnum } from 'src/roles/roles.enum';
import { User } from 'src/users/domain/user';
import { ConfigService } from '@nestjs/config';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { JobsiteWasteStreamLocationsEntity } from 'src/job-site-waste-stream-locations/infrastructure/persistence/relational/entities/job-site-waste-stream-locations.entity';
import { UpdateJobSiteWasteStreamOrderDto } from './dto/update-job-sites-waste-streams-order.dto';
// import { JobsiteWasteStreamLocations } from 'src/job-site-waste-stream-locations/domain/job-site-waste-stream-locations';
import { CreateWasteStreamCameraDto } from 'src/wastestream-cameras/dto/create-wastestream-cameras.dto';
import { CreateJobsiteWasteStreamLocationDto } from 'src/job-site-waste-stream-locations/dto/create-waste-stream-locations.dto';
import { WasteStreamsEntity } from 'src/wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { VesselEntity } from 'src/vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { LocationsToTypesEnum } from 'src/locations/locationToTypes.enum';
import { LocationsTypeEnum } from 'src/locations/locationTypes.enum';
import { Address } from 'src/address/domain/address';
import { EmissionFactorsService } from 'src/emission-factors/emission-factors.service';
import { ALLOWD_ROLES_FOR_MAP } from './utils/waste-Stream-constants';
import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { WasteStreamImageEntity } from 'src/waste-stream-images/infrastructure/persistence/relational/entities/waste-stream-image.entity';
import fileConfig from 'src/files/config/file.config';
import { FileConfig, FileDriver } from 'src/files/config/file-config.type';
import appConfig from 'src/config/app.config';
import { AppConfig } from 'src/config/app-config.type';
@Injectable()
export class JobSitesWasteStreamsService {
  constructor(
    @InjectRepository(JobSitesWasteStreamsEntity)
    private jobSitesWasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(JobSiteWastestreamsDumpstersEntity)
    private JobSiteWastestreamsDumpstersRepository: Repository<JobSiteWastestreamsDumpstersEntity>,
    @InjectRepository(JobSiteEntity)
    private readonly jobSitesRepository: Repository<JobSiteEntity>,
    @InjectRepository(JobSitesCamerasEntity)
    private readonly jobSiteCameraRepository: Repository<JobSitesCamerasEntity>,
    @InjectRepository(WasteStreamCamerasEntity)
    private readonly wasteStreamCamerasRepository: Repository<WasteStreamCamerasEntity>,
    @InjectRepository(JobsiteWasteStreamLocationsEntity)
    private readonly jobsiteWasteStreamLocationsRepository: Repository<JobsiteWasteStreamLocationsEntity>,
    @InjectRepository(WasteStreamsEntity)
    private readonly wasteStreamRepository: Repository<WasteStreamsEntity>,
    @InjectRepository(WasteStreamTypesEntity)
    private readonly wasteStreamTypesRepository: Repository<WasteStreamTypesEntity>,
    @InjectRepository(VesselEntity)
    private readonly vesselRepository: Repository<VesselEntity>,
    @InjectRepository(PowerPlantsEntity)
    private readonly powerPlantsRepository: Repository<PowerPlantsEntity>,
    @InjectRepository(WasteStreamImageEntity)
    private readonly wasteStreamImageRepository: Repository<WasteStreamImageEntity>,
    private readonly configService: ConfigService,
    private readonly emissionFactorsService: EmissionFactorsService,
    private readonly jobSiteStats: JobSiteStats,
  ) {}

  async findAll() {
    return await this.jobSitesWasteStreamsRepository.find();
  }
  async findOne(id: number) {
    return await this.jobSitesWasteStreamsRepository.findOne({
      where: { id: id },
      relations: {
        wasteStreamCameras: true,
        wasteStreamLocations: true,
      },
    });
  }

  async findAllByJobSiteIdForMobile(jobSiteId: number): Promise<object> {
    const wasteStreams = await this.jobSitesWasteStreamsRepository.find({
      where: { jobSite: { id: jobSiteId } },
      relations: {
        wasteStream: true,
        wasteStreamLocations: true,
        jobSite: { client: true },
        jobSitesWasteStreamsDumpsters: true,
      },
      order: { order: 'DESC', id: 'DESC' },
      withDeleted: true,
    });

    // Exclude deleted streams that have no haul data
    const filtered = wasteStreams.filter(
      (item) =>
        !item.deletedAt ||
        (item.jobSitesWasteStreamsDumpsters?.length ?? 0) > 0,
    );

    const mapped = filtered.map((item) => {
      const { vesselType, vesselKey, optionValue } = transformVesselOptionType(
        item.vessel?.name ?? '',
        item.vesselOption?.value,
      );
      return {
        ...item,
        dumpster_type: vesselType,
        dumpster_key: vesselKey,
        dumpster_weight: optionValue,
      };
    });

    return { jobSitesWasteStreams: mapped };
  }

  async findByJobSiteId(jobSiteId: JobSite['id']) {
    const jobSite = await this.jobSitesRepository.findOne({
      where: { id: jobSiteId },
      relations: {
        jobSitesWasteStreams: {
          wasteStreamCameras: {
            jobsiteWasteStream: {
              jobSite: true,
            },
          },
          wasteStreamLocations: true,
        },
      },
    });

    return jobSite ? JobSiteMapper.toDomain(jobSite) : null;
  }

  private async validateCameraAndLocations(
    wasteStreamCameras: CreateWasteStreamCameraDto | undefined,
    wasteStreamLocations: CreateJobsiteWasteStreamLocationDto[] | undefined,
    wasteStreamId: JobSiteWasteStreams['id'] | undefined,
  ): Promise<void> {
    // Handle camera
    if (wasteStreamCameras && Object.keys(wasteStreamCameras).length > 0) {
      if (
        wasteStreamCameras.cameraId === wasteStreamCameras.additionalCameraId
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            errors: {
              camera: 'cameraId and additionalCameraId must be different',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingCamera = await this.wasteStreamCamerasRepository.findOne({
        where: { jobsiteWasteStream: { id: wasteStreamId } },
      });

      if (existingCamera) {
        await this.wasteStreamCamerasRepository.update(existingCamera.id, {
          ...wasteStreamCameras,
        });
      } else {
        const newCamera = this.wasteStreamCamerasRepository.create({
          ...wasteStreamCameras,
          jobsiteWasteStream: { id: wasteStreamId },
        });
        await this.wasteStreamCamerasRepository.save(newCamera);
      }
    }

    // Handle wasteStreamLocations
    if (!wasteStreamLocations?.length) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: { locations: 'There must be one processing location' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const processingLocation = wasteStreamLocations.filter(
      (loc) => loc.type === 1,
    );

    if (processingLocation.length !== 1) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: {
            locations:
              processingLocation.length === 0
                ? 'There must be one processing location'
                : 'There cannot be more than one processing location',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.jobsiteWasteStreamLocationsRepository.delete({
      jobsiteWasteStream: { id: wasteStreamId },
    });

    const locationEntities = wasteStreamLocations.map((locDto) =>
      this.jobsiteWasteStreamLocationsRepository.create({
        ...locDto,
        jobsiteWasteStream: { id: wasteStreamId },
      }),
    );

    await this.jobsiteWasteStreamLocationsRepository.save(locationEntities);
  }

  private filterDeletedStreamsForMonth(
    items: JobSitesWasteStreamsEntity[],
    formattedStartDate: string,
    formattedEndDate: string,
  ): JobSitesWasteStreamsEntity[] {
    // Normalize to UTC boundaries to avoid timezone drift
    const monthStart = new Date(`${formattedStartDate}T00:00:00.000Z`);
    const monthEnd = new Date(`${formattedEndDate}T23:59:59.999Z`);
    return items.filter((item) => {
      if (!item.deletedAt) return true;
      const deletedAtDate = new Date(item.deletedAt as any);
      const isDeletionMonth =
        deletedAtDate >= monthStart && deletedAtDate <= monthEnd;
      if (isDeletionMonth) {
        const hasDumpstersInWindow =
          Array.isArray(item.jobSitesWasteStreamsDumpsters) &&
          item.jobSitesWasteStreamsDumpsters.length > 0 &&
          item.jobSitesWasteStreamsDumpsters.some((d) => {
            const createdAt =
              d.creationDate instanceof Date
                ? d.creationDate
                : new Date(d.creationDate as any);
            if (isNaN(createdAt.getTime())) return false;
            return createdAt >= monthStart && createdAt <= monthEnd;
          });
        return hasDumpstersInWindow;
      }
      // If deleted after this month, include (this month and previous months)
      return deletedAtDate > monthEnd;
    });
  }

  async getCo2AndRecyclingRebate(
    wasteStreamId: number | undefined,
    co2: number | undefined,
    recycling_rebate: number | undefined,
  ): Promise<{ co2Value: number | null; recyclingRebate: number | null }> {
    const wasteStream = await this.wasteStreamRepository.findOne({
      where: { id: wasteStreamId },
    });

    if (!wasteStream) {
      throw new HttpException(
        { status: HttpStatus.NOT_FOUND, error: 'Waste stream not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    const normalizedName = wasteStream.name?.toLowerCase();
    let co2Value: number | null = null;
    let rebateValue: number | null = null;

    if (normalizedName === 'wood waste') {
      co2Value = co2 ?? null;
    } else if (normalizedName === 'card board') {
      rebateValue = recycling_rebate ?? null;
    }

    return {
      co2Value: co2Value,
      recyclingRebate: rebateValue,
    };
  }

  async create(
    createDto: CreateJobSitesWasteStreamsDto,
  ): Promise<JobSiteWasteStreams> {
    try {
      const {
        jobSiteId,
        wastestreamsId,
        wasteStreamTypeId,
        haulerId,
        locationId,
        powerplantId,
        dumpsterId,
        wasteStreamCameras,
        wasteStreamLocations,
        co2,
        recycling_rebate,
      } = createDto;

      // set waste stream order
      const maxOrderWasteStream =
        await this.jobSitesWasteStreamsRepository.findOne({
          where: { jobSite: { id: jobSiteId } },
          order: { order: 'DESC' },
        });

      const maxOrder = maxOrderWasteStream?.order || 0;

      // set co2 and recycling_rebate
      const { co2Value, recyclingRebate } = await this.getCo2AndRecyclingRebate(
        wastestreamsId,
        co2,
        recycling_rebate,
      );

      const wastestreams = this.jobSitesWasteStreamsRepository.create({
        ...createDto,
        jobSite: { id: jobSiteId },
        wasteStream: { id: wastestreamsId },
        wasteStreamType: { id: wasteStreamTypeId },
        hauler: { id: haulerId },
        ...(locationId !== undefined &&
          locationId !== null && {
            location: { id: Number(locationId) },
          }),
        ...(powerplantId !== undefined &&
          powerplantId !== null && {
            powerplant: { id: Number(powerplantId) },
          }),
        dumpster: { id: dumpsterId },
        order: maxOrder + 1,
        co2: co2Value,
        recycling_rebate: recyclingRebate,
      });

      const jobsiteWasteStream =
        await this.jobSitesWasteStreamsRepository.save(wastestreams);

      if (wasteStreamCameras && Object.keys(wasteStreamCameras).length > 0) {
        if (
          wasteStreamCameras.cameraId === wasteStreamCameras.additionalCameraId
        ) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              errors: {
                camera: 'cameraId and additionalCameraId must be different',
              },
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        const cameraEntity = this.wasteStreamCamerasRepository.create({
          ...wasteStreamCameras,
          jobsiteWasteStream: { id: jobsiteWasteStream.id },
        });

        await this.wasteStreamCamerasRepository.save(cameraEntity);
      }

      // Validate wasteStreamLocations
      if (!wasteStreamLocations?.length) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            errors: { locations: 'There must be one processing location' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Filter locations with type=1
      const processingLocation = wasteStreamLocations.filter(
        (loc) => loc.type === 1,
      );

      // Ensure there is at least one type=1 location
      // Ensure there is not more than one type=1 location
      if (processingLocation.length !== 1) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            errors: {
              locations:
                processingLocation.length === 0
                  ? 'There must be one processing location'
                  : 'There cannot be more than one processing location',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check for existing locations to prevent duplicates
      const existingLocations =
        await this.jobsiteWasteStreamLocationsRepository.find({
          where: { jobsiteWasteStream: { id: jobsiteWasteStream.id } },
        });

      // Filter out locations that already exist (by locationId or powerplantId)
      const newLocations = wasteStreamLocations.filter((locDto) => {
        const isDuplicate = existingLocations.some((existing) => {
          // Check if locationId matches
          if (locDto.locationId && existing.locationId === locDto.locationId) {
            return true;
          }
          // Check if powerplantId matches
          if (
            locDto.powerplantId &&
            existing.powerplantId === locDto.powerplantId
          ) {
            return true;
          }
          return false;
        });
        return !isDuplicate;
      });

      // Only insert non-duplicate locations
      if (newLocations.length > 0) {
        const locationEntities = newLocations.map((locDto) =>
          this.jobsiteWasteStreamLocationsRepository.create({
            ...locDto,
            jobsiteWasteStream: { id: jobsiteWasteStream.id },
          }),
        );

        await this.jobsiteWasteStreamLocationsRepository.save(locationEntities);
      }

      return jobsiteWasteStream;
    } catch (exceptions) {
      throw exceptions;
    }
  }

  async update(id: number, updateDto: CreateJobSitesWasteStreamsDto) {
    try {
      // Check if the haulerId exists in any other waste stream of this job site
      // const wasteStream = await this.findOne(id);

      // if (wasteStream?.hauler?.id !== updateDto.haulerId) {
      //   const existingWasteStreams =
      //     await this.jobSitesWasteStreamsRepository.find({
      //       where: {
      //         jobSite: { id: updateDto.jobSiteId },
      //         hauler: { id: wasteStream?.hauler?.id },
      //       },
      //     });

      //   const otherWasteStream = existingWasteStreams.find(
      //     (wasteStream) => wasteStream.id !== id,
      //   );

      //   if (!otherWasteStream) {
      //     // Check if the haulerId is associated with any camera on this job site
      //     const existingCamera = await this.jobSiteCameraRepository.findOne({
      //       where: {
      //         jobSite: { id: updateDto.jobSiteId },
      //         alertTo: wasteStream?.haulerId,
      //         alertToType: AlertToType.HAULER,
      //       },
      //     });

      //     if (existingCamera) {
      //       throw new HttpException(
      //         {
      //           status: HttpStatus.BAD_REQUEST,
      //           errors: {
      //             camera: 'associatedWithCamera',
      //             cameraName: existingCamera.name,
      //           },
      //         },
      //         HttpStatus.BAD_REQUEST,
      //       );
      //     }
      //   }
      // }

      const {
        jobSiteId,
        wastestreamsId,
        wasteStreamTypeId,
        haulerId,
        locationId,
        powerplantId,
        dumpsterId,
        wasteStreamCameras,
        wasteStreamLocations,
        ...restDto
      } = updateDto;

      // set co2 and recycling_rebate
      const { co2Value, recyclingRebate } = await this.getCo2AndRecyclingRebate(
        wastestreamsId,
        restDto.co2,
        restDto.recycling_rebate,
      );

      await this.jobSitesWasteStreamsRepository.update(
        { id: id },
        this.jobSitesWasteStreamsRepository.create({
          ...restDto,
          jobSite: { id: jobSiteId },
          wasteStream: { id: wastestreamsId },
          wasteStreamType: { id: wasteStreamTypeId },
          hauler: { id: haulerId },
          location: { id: locationId },
          powerplant: { id: powerplantId },
          dumpster: { id: dumpsterId },
          co2: co2Value,
          recycling_rebate: recyclingRebate,
        }),
      );

      await this.validateCameraAndLocations(
        wasteStreamCameras,
        wasteStreamLocations,
        id,
      );

      const getWasteStream = await this.findOne(id);
      return getWasteStream;
    } catch (exceptions) {
      throw exceptions;
    }
  }

  async getBarGraph(
    startDate: string,
    jobSiteId: number,
    endDate: string,
  ): Promise<object> {
    const start = new Date(startDate); // Parse the start date as an ISO date string
    const end = new Date(endDate); // Parse the start date as an ISO date string

    const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
    const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

    const jobSitesWasteStreamsData =
      await this.jobSitesWasteStreamsRepository.find({
        relations: {
          wasteStream: true,
          jobSitesWasteStreamsDumpsters: true,
          // location: true,
          wasteStreamLocations: true,
          jobSite: { client: true },
        },
        where: {
          jobSite: { id: Number(jobSiteId) },
        },
        withDeleted: true,
      });

    const filteredJobSitesWasteStreamsData = this.filterDeletedStreamsForMonth(
      jobSitesWasteStreamsData,
      formattedStartDate,
      formattedEndDate,
    );

    const jsWsDt = filteredJobSitesWasteStreamsData.map(async (item) => {
      const jobSitesWasteStreamsDumpstersData =
        await this.JobSiteWastestreamsDumpstersRepository.find({
          where: {
            jobSiteWastestreams: { id: item.id },
            creationDate: Between(
              new Date(formattedStartDate),
              new Date(formattedEndDate + ' 23:59:59'),
            ),
          },
          withDeleted: true,
        });
      item.jobSitesWasteStreamsDumpsters = jobSitesWasteStreamsDumpstersData;

      const jsWsDumpstersTons =
        item.getJobsiteWastestreamDumpstersTotalWeight();
      const jsWsDumpstersMoved = Number(
        item.jobSitesWasteStreamsDumpsters?.length,
      );

      const jsWsDumpstersTonsNotLandfill =
        item.getJobsiteWastestreamDumpstersTotalWeight(true);

      const { vesselType, vesselKey, optionValue } = transformVesselOptionType(
        item.vessel?.name,
        item.vesselOption?.value,
      );
      return {
        ...item,
        tons: Number(jsWsDumpstersTons.toFixed(2)),
        moved: jsWsDumpstersMoved,
        dumpster_type: vesselType,
        dumpster_key: vesselKey,
        dumpster_weight: optionValue,
        diverted_tons: Number(jsWsDumpstersTonsNotLandfill.toFixed(2)),
      };
    });
    const jobSitesWasteStreams = await Promise.all(jsWsDt);

    const totals = jobSitesWasteStreams.reduce(
      (acc, stream) => {
        acc.totalTons += Number(stream.tons || 0);
        acc.totalMoved += Number(stream.moved || 0);
        acc.totalDiverted += Number(stream.diverted_tons || 0);
        return acc;
      },
      { totalTons: 0, totalMoved: 0, totalDiverted: 0 },
    );

    const totalWasteDiverted =
      totals.totalTons === 0
        ? 0
        : Number(((totals.totalDiverted / totals.totalTons) * 100).toFixed(2));

    return {
      jobSitesWasteStreams,
      total_moved: totals.totalMoved,
      total_tons: Number(totals.totalTons.toFixed(2)),
      tons_diverted: Number(totals.totalDiverted.toFixed(2)),
      waste_diversion: totalWasteDiverted,
    };
  }

  async getBarGraphByJobSiteIds(
    startDate: string,
    endDate: string,
    jobSiteId: any,
  ): Promise<object> {
    const start = new Date(startDate); // Parse the start date as an ISO date string
    const end = new Date(endDate); // Parse the start date as an ISO date string

    const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
    const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

    const jobSitesWasteStreamsData =
      await this.jobSitesWasteStreamsRepository.find({
        relations: {
          wasteStream: true,
          jobSitesWasteStreamsDumpsters: true,
          location: true,
          jobSite: { client: true },
        },
        where: {
          jobSite: { id: In(jobSiteId) },
          jobSitesWasteStreamsDumpsters: {
            creationDate: Between(
              new Date(formattedStartDate),
              new Date(formattedEndDate),
            ),
          },
        },
        withDeleted: true,
      });

    // let totalTons = 0;
    // let totalMoved = 0;

    const groupedJobs = this.groupByJobSiteId(jobSitesWasteStreamsData);
    const jobSitesWasteStreams: Array<{
      jobsiteName: string | null;
      jobSiteId: string;
      data: Array<{
        name: string;
        tons: number;
        moved: number;
        dumpster_type: string | null;
        dumpster_key: string | null;
        dumpster_weight: string | null;
      }>;
    }> = [];

    for (const jobSiteId in groupedJobs) {
      const clientJobSitesWasteStreams = groupedJobs[jobSiteId];
      const jobsiteName = clientJobSitesWasteStreams[0].jobSite.title;

      const jobSitesWasteStreamsDumpstersData = clientJobSitesWasteStreams.map(
        (jobSitesWastestreams: JobSitesWasteStreamsEntity) => {
          const jsWsDumpstersTons =
            jobSitesWastestreams.getJobsiteWastestreamDumpstersTotalWeight();
          const jsWsDumpstersMoved = Number(
            jobSitesWastestreams.jobSitesWasteStreamsDumpsters?.length,
          );

          // totalTons += jsWsDumpstersTons;
          // totalMoved += jsWsDumpstersMoved;

          return {
            name: jobSitesWastestreams.wasteStream.name,
            tons: Number(jsWsDumpstersTons.toFixed(2)),
            moved: jsWsDumpstersMoved,
            dumpster_type: jobSitesWastestreams.dumpster_key,
            dumpster_key: jobSitesWastestreams.dumpster_key,
            dumpster_weight: jobSitesWastestreams.dumpster_weight,
          };
        },
      );
      jobSitesWasteStreams.push({
        jobsiteName: jobsiteName,
        jobSiteId: jobSiteId,
        data: jobSitesWasteStreamsDumpstersData,
      });
    }
    return {
      jobSitesWasteStreams,
    };
  }

  groupByJobSiteId(
    data: JobSitesWasteStreamsEntity[],
  ): Record<number, JobSitesWasteStreamsEntity[]> {
    return data.reduce(
      (acc, job) => {
        const jobSiteId = job.jobSiteId;
        acc[jobSiteId] = acc[jobSiteId] || [];
        acc[jobSiteId].push(job);
        return acc;
      },
      {} as Record<number, JobSitesWasteStreamsEntity[]>,
    );
  }

  async getBarGraphByClient(
    startDate: string,
    endDate: string,
    clientId: any,
    user: User,
  ): Promise<object> {
    const isDemo = this.configService.getOrThrow('app.isDemo', { infer: true });

    const start = new Date(startDate); // Parse the start date as an ISO date string
    const end = new Date(endDate); // Parse the start date as an ISO date string

    const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
    const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

    let where: { client?: { id: any }; endClientId?: any } = {
      client: { id: In(clientId) },
    };
    if (user.role?.id === RoleEnum.end_client && !isDemo) {
      where = {
        endClientId: user.isSubUser ? In([user.parentUserId]) : In([user.id]),
      };
    }

    const jobSitesWasteStreamsData =
      await this.jobSitesWasteStreamsRepository.find({
        relations: {
          wasteStream: true,
          jobSitesWasteStreamsDumpsters: true,
          jobSite: { client: true },
        },
        where: {
          jobSite: where,
          jobSitesWasteStreamsDumpsters: {
            creationDate: Between(
              new Date(formattedStartDate),
              new Date(formattedEndDate),
            ),
          },
        },
        withDeleted: true,
      });

    // let totalTons = 0;
    // let totalMoved = 0;

    const groupedJobs = this.groupByClientId(jobSitesWasteStreamsData);
    const jobSitesWasteStreams: Array<{
      clientName: string | null;
      clientId: string;
      data: Array<{
        name: string;
        tons: number;
        moved: number;
        dumpster_type: string | null;
        dumpster_key: string | null;
        dumpster_weight: string | null;
      }>;
    }> = [];

    for (const clientId in groupedJobs) {
      const clientJobSitesWasteStreams = groupedJobs[clientId];
      const clientName = clientJobSitesWasteStreams[0].jobSite.client.name;

      const jobSitesWasteStreamsDumpstersData = clientJobSitesWasteStreams.map(
        (jobSitesWastestreams: JobSitesWasteStreamsEntity) => {
          const jsWsDumpstersTons =
            jobSitesWastestreams.getJobsiteWastestreamDumpstersTotalWeight();
          const jsWsDumpstersMoved = Number(
            jobSitesWastestreams.jobSitesWasteStreamsDumpsters?.length,
          );

          // totalTons += jsWsDumpstersTons;
          // totalMoved += jsWsDumpstersMoved;

          return {
            name: jobSitesWastestreams.wasteStream.name,
            tons: Number(jsWsDumpstersTons.toFixed(2)),
            moved: jsWsDumpstersMoved,
            dumpster_type: jobSitesWastestreams.dumpster_key,
            dumpster_key: jobSitesWastestreams.dumpster_key,
            dumpster_weight: jobSitesWastestreams.dumpster_weight,
          };
        },
      );
      jobSitesWasteStreams.push({
        clientName: clientName,
        clientId: clientId,
        data: jobSitesWasteStreamsDumpstersData,
      });
    }
    return {
      jobSitesWasteStreams,
    };
  }

  groupByClientId(
    data: JobSitesWasteStreamsEntity[],
  ): Record<number, JobSitesWasteStreamsEntity[]> {
    return data.reduce(
      (acc, job) => {
        const clientId = job.jobSite.clientId;
        acc[clientId] = acc[clientId] || [];
        acc[clientId].push(job);
        return acc;
      },
      {} as Record<number, JobSitesWasteStreamsEntity[]>,
    );
  }

  async getDashboardTreeGraphStats(
    startDate: string,
    endDate: string,
    jobSiteId: number | undefined,
  ) {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      // const jobSiteStats = this.jobSiteStats(
      //   formattedStartDate,
      //   formattedEndDate,
      //   jobSiteId,
      // );

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.jobSiteId = Number(jobSiteId);

      const woodWaste = (await this.jobSiteStats.woodWaste()).totalTons;
      const landfill = (await this.jobSiteStats.landfill()).totalTons;

      const remanufacturing = (await this.jobSiteStats.remanufacturing())
        .totalTons;

      const industrialProduct = (await this.jobSiteStats.industrialProduct())
        .totalTons;
      const biomassCleanEnergy = (await this.jobSiteStats.biomassCleanEnergy())
        .totalTons;
      const cleanEnergy = await this.jobSiteStats.cleanEnergy();

      return {
        wood_waste: woodWaste,
        landfill: landfill,
        clean_energy: biomassCleanEnergy || cleanEnergy,
        remanufacturing: remanufacturing,
        industrial_product: industrialProduct,
        biomass_clean_energy: biomassCleanEnergy,
        carbon_credits: 0, // TODO: once requirement is clear
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getDashboardTreeGraphDiversionStats(
    startDate: string,
    endDate: string,
    jobSiteId: JobSite['id'] | undefined,
  ) {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.jobSiteId = Number(jobSiteId);

      const totalDiverted = (await this.jobSiteStats.totalDiverted()).totalTons;
      const jobSite = await this.jobSiteStats.jobSite();
      const chuckResult = await this.jobSiteStats.chuckResult();
      const cleanEnergy = await this.jobSiteStats.cleanEnergy();

      const totalWoodWaste = (await this.jobSiteStats.woodWaste()).totalTons;
      const rejected = totalWoodWaste - totalDiverted;

      // Calculate diverted percentage
      const divertedPercentage =
        totalWoodWaste === 0
          ? 0
          : Number(((totalDiverted / totalWoodWaste) * 100).toFixed(2));

      const transportCo2 =
        await this.jobSiteStats.getWoodWasteTransportCo2(jobSiteId);

      // Calculate CO₂ avoided from biomass using emission factor from database
      const biomassTons = (await this.jobSiteStats.biomassCleanEnergy())
        .totalTons;

      const total_co2_diverted = Number((totalDiverted * 1.65).toFixed(2));
      const newco2Avoided = Math.round(total_co2_diverted) - transportCo2;
      return {
        total_diverted: totalDiverted,
        total_co2_diverted: Number((totalDiverted * 1.65).toFixed(2)),
        client_diversion_goal: jobSite.jobSiteDetails?.sustainabilityGoal || 0,
        chuck_result: chuckResult,
        clean_energy: biomassTons || cleanEnergy,
        diverted: 0,
        rejected: Number(rejected.toFixed(2)),
        diverted_percentage: divertedPercentage,
        transport_co2: transportCo2,
        net_co2_avoided: newco2Avoided,
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getDashboardTreeGraphWasteStreamsStats(
    startDate: string,
    endDate: string,
    jobSiteId: JobSite['id'] | undefined,
  ): Promise<object> {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.jobSiteId = Number(jobSiteId);

      const cardBoardDt = await this.jobSiteStats.cardBoard();
      const wasteHaulingDt = await this.jobSiteStats.wasteHauling();
      const metalDt = await this.jobSiteStats.metal();
      const concreteDt = await this.jobSiteStats.concrete();
      const plasticDt = await this.jobSiteStats.plastic();

      const cardBoardCo2 =
        await this.jobSiteStats.getTypeTransportCo2('CARD BOARD');
      const wasteHaulingCo2 =
        await this.jobSiteStats.getTypeTransportCo2('WASTE HAULING');
      const metalCo2 = await this.jobSiteStats.getTypeTransportCo2('METAL');
      const concreteCo2 = await this.jobSiteStats.getTypeTransportCo2('CONCRETE');
      const plasticCo2 = await this.jobSiteStats.getTypeTransportCo2('PLASTIC');

      return {
        card_board: {
          delivered: cardBoardDt.totalTons,
          delivered_to: cardBoardDt.locationsTo.join(', '),
          transport_co2: cardBoardCo2,
          rebate_recycling: 0, // TODO: once requirement is clear
        },
        waste_hauling: {
          delivered: wasteHaulingDt.totalTons,
          delivered_to: wasteHaulingDt.locationsTo.join(', '),
          transport_co2: wasteHaulingCo2,
        },
        metal: {
          delivered: metalDt.totalTons,
          delivered_to: metalDt.locationsTo.join(', '),
          transport_co2: metalCo2,
        },
        concrete: {
          delivered: concreteDt.totalTons,
          delivered_to: concreteDt.locationsTo.join(', '),
          transport_co2: concreteCo2,
        },
        plastic: {
          delivered: plasticDt.totalTons,
          delivered_to: plasticDt.locationsTo.join(', '),
          transport_co2: plasticCo2,
        },
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getDashboardWoodWasteDiversionStats(
    startDate: string,
    endDate: string,
    jobSiteId: JobSite['id'] | undefined,
  ): Promise<object> {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.jobSiteId = Number(jobSiteId);

      const chuckResult = await this.jobSiteStats.chuckResult();
      const woodWaste = (await this.jobSiteStats.woodWaste()).totalTons;
      const totalDiverted = (await this.jobSiteStats.totalDiverted()).totalTons;
      const totalWasteDiversion =
        woodWaste === 0
          ? 0
          : Number(
              ((await this.jobSiteStats.getTotalWeightWithoutLandfill())
                .totalTons /
                (await this.jobSiteStats.getTotalWeight()).totalTons) *
                100,
            ).toFixed(2);
      return {
        wood_waste_diverted: chuckResult,
        total_waste_diversion: totalDiverted,
        wood_waste_collected: woodWaste,
        total_wood_waste_diversion: totalWasteDiversion, //totalDiverted,
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getJobsiteWastestream({
    wastestream,
    location,
    jobSiteId,
    formattedStartDate,
    formattedEndDate,
  }: {
    wastestream: string[];
    location: any;
    jobSiteId: number | undefined;
    formattedStartDate: string;
    formattedEndDate: string;
  }) {
    const jobSitesWasteStreamsData =
      await this.jobSitesWasteStreamsRepository.find({
        relations: {
          wasteStream: true,
          jobSitesWasteStreamsDumpsters: true,
          location: true,
          jobSite: true,
        },
        where: {
          ...(jobSiteId !== undefined && {
            jobSite: { id: Number(jobSiteId) },
          }),
          wasteStream: { name: In(wastestream) },
          location: location,
          jobSitesWasteStreamsDumpsters: {
            creationDate: Between(
              new Date(formattedStartDate),
              new Date(formattedEndDate),
            ),
          },
        },
      });
    let totalTons = 0;

    jobSitesWasteStreamsData.forEach((item) => {
      totalTons += item.getJobsiteWastestreamDumpstersTotalWeight();
    });

    return Number(totalTons.toFixed(2));
  }

  async updateWasteStreamsOrder(
    updateDto: UpdateJobSiteWasteStreamOrderDto,
    jobSiteId: number,
  ) {
    try {
      const { wasteStreams } = updateDto;

      // Validate unique IDs
      const ids = wasteStreams.map((w) => w.id);
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Duplicate waste stream IDs found in payload.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Fetch all waste streams from DB that match these IDs
      const dbWasteStreams = await this.jobSitesWasteStreamsRepository.find({
        where: {
          id: In(ids),
          jobSite: { id: jobSiteId },
        },
      });
      const dbIds = dbWasteStreams.map((ws) => ws.id).sort((a, b) => a - b);
      const requestIds = [...uniqueIds].sort((a, b) => a - b);

      const idsMatch =
        dbIds.length === requestIds.length &&
        dbIds.every((id, index) => id === requestIds[index]);

      if (!idsMatch) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              'Some waste stream IDs do not belong to the specified job site.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate order sequence
      const orders = wasteStreams.map((w) => w.order).sort((a, b) => a - b);
      const expected = Array.from(
        { length: wasteStreams.length },
        (_, i) => i + 1,
      );
      const isValidOrder = orders.every(
        (val, index) => val === expected[index],
      );

      if (!isValidOrder) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              'Order values must be a continuous sequence starting from 1.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Proceed with update
      const updatePromises = wasteStreams.map((item) =>
        this.jobSitesWasteStreamsRepository.update(
          { id: item.id },
          { order: item.order },
        ),
      );

      await Promise.all(updatePromises);

      return { message: 'Waste streams order updated successfully' };
    } catch (exceptions) {
      throw exceptions;
    }
  }

  async delete(id: number) {
    const existing = await this.jobSitesWasteStreamsRepository.findOne({
      where: { id },
      relations: ['jobSite'],
    });

    if (!existing) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Waste stream not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const deletedOrder = existing.order;
    const jobSiteId = existing.jobSite?.id;

    // Remove associations with cameras before soft delete
    await this.wasteStreamCamerasRepository.delete({
      jobsiteWasteStream: { id },
    });

    // Set order = null instead of deleting
    await this.jobSitesWasteStreamsRepository.update(id, { order: null });

    // Fetch waste streams with higher order to reorder them
    const wasteStreamsToUpdate = await this.jobSitesWasteStreamsRepository.find(
      {
        where: {
          jobSite: { id: jobSiteId },
          order: MoreThan(deletedOrder as number),
        },
        order: { order: 'ASC' },
      },
    );

    // Shift each order down by 1
    if (wasteStreamsToUpdate && wasteStreamsToUpdate.length > 0) {
      for (const stream of wasteStreamsToUpdate) {
        if (stream && stream.order) {
          stream.order = stream.order - 1;
        }
      }
    }

    await this.jobSitesWasteStreamsRepository.save(wasteStreamsToUpdate);

    await this.jobSitesWasteStreamsRepository.softDelete(id);
  }

  async migrateData() {
    // Select all waste streams where location is not null
    const streams = await this.jobSitesWasteStreamsRepository.find({
      where: { wasteStreamType: IsNull() },
      relations: ['location', 'hauler', 'powerplant'],
      withDeleted: true,
    });

    for (const stream of streams) {
      // if (stream.jobSiteId === 73) {
      // -------------------- waste stream type --------------------
      const oldType = await this.wasteStreamTypesRepository.findOne({
        where: {
          wasteStreamId: stream.wasteStream.id,
          name: 'Old',
        },
      });
      if (oldType) {
        await this.jobSitesWasteStreamsRepository.update(stream.id, {
          wasteStreamType: { id: oldType.id },
        });
      }
      // -------------------- waste stream type --------------------

      // -------------------- location --------------------
      // processing location
      const exists = await this.jobsiteWasteStreamLocationsRepository.findOne({
        where: { jobsiteWasteStream: { id: stream.id }, type: 1 },
      });
      if (!exists) {
        const locationData: {
          jobsiteWasteStream: { id: number };
          type: number;
          haulerId?: number;
          distance?: number;
          location?: { id: number };
          powerplant?: { id: number };
        } = {
          jobsiteWasteStream: { id: stream.id },
          type: 1,
          ...(stream.hauler?.id && { haulerId: stream.hauler.id }),
          ...(stream.distance && { distance: stream.distance }),
        };

        if (stream.location?.id) {
          locationData.location = { id: stream.location.id };
        } else if (stream.powerplant?.id) {
          locationData.powerplant = { id: stream.powerplant.id };
        }

        await this.jobsiteWasteStreamLocationsRepository.save(
          this.jobsiteWasteStreamLocationsRepository.create(locationData),
        );
      }

      // end location
      const endLocationExists =
        await this.jobsiteWasteStreamLocationsRepository.findOne({
          where: { jobsiteWasteStream: { id: stream.id }, type: 2 },
        });
      if (!endLocationExists) {
        if (stream.location?.id) {
          const loc = stream.location;
          if (loc.to && loc.toType) {
            const locationData: {
              jobsiteWasteStream: { id: number };
              type: number;
              haulerId?: number;
              distance?: number;
              location?: { id: number };
              powerplant?: { id: number };
            } = {
              jobsiteWasteStream: { id: stream.id },
              type: 2,
              ...(stream.hauler?.id && { haulerId: stream.hauler.id }),
              ...(loc.inMiles && { distance: loc.inMiles }),
            };
            if (loc.toType === LocationsToTypesEnum.powerplant) {
              locationData.powerplant = { id: loc.to };
            } else if (loc.toType === LocationsToTypesEnum.location) {
              locationData.location = { id: loc.to };
            }

            await this.jobsiteWasteStreamLocationsRepository.save(
              this.jobsiteWasteStreamLocationsRepository.create(locationData),
            );
          }
        }
      }
      // -------------------- location --------------------
    }

    // }
    return { migrated: streams.length };
  }

  async getVesselOptionsType() {
    // Get all vesselOptionIds used in job site waste streams
    const usedOptionIds: number[] = [];
    const jobSiteWasteStreams = await this.jobSitesWasteStreamsRepository.find({
      where: { vesselOptionId: Not(IsNull()) },
    });
    for (const jsws of jobSiteWasteStreams) {
      if (jsws.vesselOptionId) usedOptionIds.push(jsws.vesselOptionId);
    }

    // Fetch all vessels and their options
    const vessels = await this.vesselRepository.find({
      relations: ['options'],
    });

    // Build response array
    const result: Array<{
      key: string;
      label: string;
      dumpsterType: string;
      dumpsterKey: string;
      dumpsterWeight: string | number;
      vesselOptionId: number;
      vesselId: number;
    }> = [];
    for (const vessel of vessels) {
      if (vessel.options && vessel.options.length > 0) {
        for (const option of vessel.options) {
          const { vesselType, vesselKey, optionValue } =
            transformVesselOptionType(vessel.name, (option as any).value);
          result.push({
            key: vesselKey,
            label: `${(option as any).value}YD`,
            dumpsterType: vesselType,
            dumpsterKey: vessel.name.toLowerCase().replace(/\s+/g, '_'),
            dumpsterWeight: optionValue,
            vesselOptionId: (option as any).id,
            vesselId: vessel.id,
          });
        }
      }
    }
    return result;
  }

  getAddressData(address: Address) {
    if (!address) {
      return null;
    }
    return {
      addressFull: address.addressFull,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      lat: Number(address.lat),
      lng: Number(address.lng),
    };
  }

  /**
   * POST version of map data - accepts filters in body with multiple material destinations.
   * Empty materialDestinations = all destinations considered.
   */
  async getMapDataStatsForUser(
    user: User,
    filters: {
      startDate?: string;
      endDate?: string;
      jobSiteId?: number;
      wasteType?: string;
      materialDestinations?: { type: string; id: number }[];
    },
  ): Promise<object> {
    if (
      filters.materialDestinations &&
      filters.materialDestinations.length === 0
    ) {
      return { totalTonnage: 0, totalDistance: 0, totalCo2Avoided: 0 };
    }

    let jobSites;
    const userId = this.getUserId(user);

    if (user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms) {
      // Stats only needs id+title — skip heavy sub-relations (jobSiteDetails, client, address)
      jobSites = await this.jobSitesRepository.find();
    } else {
      jobSites = await this.fetchJobSites(userId, filters.jobSiteId);
    }
    if (!jobSites || jobSites.length === 0) {
      return { totalTonnage: 0, totalDistance: 0, totalCo2Avoided: 0 };
    }

    const jobSiteIds = jobSites.map((js) => js.id);

    // Run main data fetch and dumpster aggregation in parallel
    const [jobSitesWasteStreamsDataRaw, dumpsterAggregates] = await Promise.all([
      this.fetchWasteStreamsDataForStats(jobSiteIds),
      this.fetchDumpsterAggregates(
        jobSiteIds,
        filters.startDate,
        filters.endDate,
      ),
    ]);

    let jobSitesWasteStreamsData = this.applyWasteStreamStatsFilters(
      jobSitesWasteStreamsDataRaw,
      filters.wasteType,
      filters.materialDestinations,
    );

    const dateRange = this.formatDateRange(filters.startDate, filters.endDate);

    const jobSitesData = this.processAndGroupWasteStreams(
      jobSitesWasteStreamsData,
      jobSites,
      dateRange,
      dumpsterAggregates,
    );
    const jsIds = jobSitesData.map((js) => js.id);
    const jsFilteredWS = jobSitesWasteStreamsData.filter((ws) =>
      jsIds.includes(ws.jobSiteId),
    );

    const totalTonnage = this.calculateTotalTonnage(jobSitesData);
    const totalDistance = this.calculateTotalDistance(jsFilteredWS);
    const totalCo2Avoided = await this.calculateTotalCo2Avoided(
      jobSitesData,
      filters.startDate,
      filters.endDate,
      user,
      jobSitesWasteStreamsData,
      dumpsterAggregates,
    );

    return {
      totalTonnage,
      totalDistance,
      totalCo2Avoided,
    };
  }

  /**
   * Applies filters for map-data-stats (multiple material destinations)
   */
  private applyWasteStreamStatsFilters(
    wasteStreamsData: any[],
    wasteType?: string,
    materialDestinations?: { type: string; id: number }[],
  ): any[] {
    let filteredData = wasteStreamsData;

    if (wasteType && wasteType !== 'All') {
      filteredData = filteredData.filter((ws) => {
        return ws.wasteStream?.name?.toLowerCase() === wasteType.toLowerCase();
      });
    }

    if (materialDestinations?.length) {
      filteredData = filteredData.filter((ws) => {
        if (!ws.wasteStreamLocations || ws.wasteStreamLocations.length === 0) {
          return false;
        }

        return ws.wasteStreamLocations.some((loc: any) => {
          return materialDestinations.some((dest) => {
            const isPowerplant =
              dest.type.toLowerCase().replace(/_/g, '') === 'powerplant';
            if (isPowerplant) {
              return loc.powerplantId === dest.id;
            }
            return loc.locationId === dest.id;
          });
        });
      });
    }

    return filteredData;
  }

  /**
   * Main method to get map data for a user
   */
  async getMapDataForUser(
    user: User,
    startDate?: string,
    endDate?: string,
    jobSiteId?: number,
    wasteType?: string,
    materialDestinations?: { type: string; id: number }[],
    includeStats = false,
    includeVerificationImages = false,
  ): Promise<object> {
    // this.validateUserAccess(user);
    let jobSites;
    const userId = this.getUserId(user);

    if (user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms) {
      jobSites = await this.jobSitesRepository.find({
        relations: {
          jobSiteDetails: true,
          client: true,
          address: true,
        },
      });
    } else {
      jobSites = await this.fetchJobSites(userId, jobSiteId);
    }
    if (!jobSites || jobSites.length === 0) {
      return this.getEmptyMapData();
    }

    const jobSiteIds = jobSites.map((js) => js.id);

    // Run main data fetch and dumpster aggregation in parallel
    const [jobSitesWasteStreamsDataRaw, dumpsterAggregates] = await Promise.all([
      this.fetchWasteStreamsData(jobSiteIds),
      this.fetchDumpsterAggregates(jobSiteIds, startDate, endDate),
    ]);

    // Apply filters
    let jobSitesWasteStreamsData = this.applyWasteStreamStatsFilters(
      jobSitesWasteStreamsDataRaw,
      wasteType,
      materialDestinations,
    );

    const dateRange = this.formatDateRange(startDate, endDate);

    const wasteStreams = this.extractUniqueWasteStreamNames(
      jobSitesWasteStreamsData,
    );
    // For CMS role: Return all powerplants in locations, not just from filtered data
    const locations = this.extractLocations(jobSitesWasteStreamsData);

    let jobSitesData = this.processAndGroupWasteStreams(
      jobSitesWasteStreamsData,
      jobSites,
      dateRange,
      dumpsterAggregates,
    );
    if (includeVerificationImages) {
      const verificationImagesByJobSite =
        await this.fetchVerificationImagesByJobSite(
          jobSitesData.map((js) => js.id),
        );
      jobSitesData = jobSitesData.map((js) => ({
        ...js,
        verificationImages: verificationImagesByJobSite.get(js.id) ?? [],
      }));
    }
    const jsIds = jobSitesData.map((js) => js.id);
    const jsFilteredWS = jobSitesWasteStreamsData.filter((ws) =>
      jsIds.includes(ws.jobSiteId),
    );

    let totalTonnage: number | undefined;
    let totalDistance: number | undefined;
    let totalCo2Avoided: number | undefined;

    if (includeStats) {
      totalTonnage = this.calculateTotalTonnage(jobSitesData);
      totalDistance = this.calculateTotalDistance(jsFilteredWS);
      totalCo2Avoided = await this.calculateTotalCo2Avoided(
        jobSitesData,
        startDate,
        endDate,
        user,
        jobSitesWasteStreamsData,
        dumpsterAggregates,
      );
    }

    return {
      wasteStreams,
      locations,
      jobSites: jobSitesData,
      ...(includeStats && { totalTonnage, totalDistance, totalCo2Avoided }),
    };
  }

  /**
   * Validates if user has access to map data
   */
  private validateUserAccess(user: User): void {
    if (!user.role?.id || !ALLOWD_ROLES_FOR_MAP.includes(user.role?.id)) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error:
            'Access denied. Only general contractors, manufacturers, and wood processing companies can access this endpoint.',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * Gets the user ID, handling sub-users
   */
  private getUserId(user: User): number {
    return Number(
      user.isSubUser && user.parentUserId ? user.parentUserId : user.id,
    );
  }

  private getUserIdForJobSiteStats(user: User): number | string | null {
    if (
      [
        RoleEnum.general_contractor,
        RoleEnum.manufacturer,
        RoleEnum.wood_processing,
        RoleEnum.end_client,
      ].includes(user.role?.id as RoleEnum)
    ) {
      return user.isSubUser && user.parentUserId ? user.parentUserId : user.id;
    }
    return null;
  }

  /**
   * Returns empty map data structure
   */
  private getEmptyMapData() {
    return {
      wasteStreams: [],
      locations: [],
      jobSites: [],
    };
  }

  private async fetchVerificationImagesByJobSite(
    jobSiteIds: number[],
  ): Promise<
    Map<
      number,
      {
        id: string;
        fileId: string;
        imageUrl: string | null;
        uploadedAt: Date;
        wasteStreamId: number;
        jobsiteWasteStreamId: number;
      }[]
    >
  > {
    if (!jobSiteIds.length) {
      return new Map();
    }

    const fileCfg = fileConfig() as FileConfig;
    const shouldSignUrls =
      fileCfg.driver === FileDriver.S3 || fileCfg.driver === FileDriver.S3_PRESIGNED;
    const s3Client = shouldSignUrls
      ? new S3Client({
          region: fileCfg.awsS3Region ?? '',
          credentials: {
            accessKeyId: fileCfg.accessKeyId ?? '',
            secretAccessKey: fileCfg.secretAccessKey ?? '',
          },
        })
      : null;

    const images = await this.wasteStreamImageRepository.find({
      where: {
        jobSiteId: In(jobSiteIds),
        isLatest: true,
      },
      order: { uploadedAt: 'DESC' },
    });

    const grouped = new Map<
      number,
      {
        id: string;
        fileId: string;
        imageUrl: string | null;
        uploadedAt: Date;
        wasteStreamId: number;
        jobsiteWasteStreamId: number;
      }[]
    >();

    const mappedImages = await Promise.all(
      images.map(async (image) => {
        if (!this.hasValidCoordinates(image.latitude, image.longitude)) return null;
        if (this.isRejectedConfidenceValue(image)) return null;

        return {
          jobSiteId: image.jobSiteId,
          data: {
            id: image.id,
            fileId: image.fileId,
            imageUrl: await this.resolveVerificationImageUrl(
              image.file?.path,
              fileCfg,
              s3Client,
            ),
            uploadedAt: image.uploadedAt,
            wasteStreamId: image.wasteStreamId,
            jobsiteWasteStreamId: image.jobsiteWasteStreamId,
          },
        };
      }),
    );

    mappedImages.forEach((entry) => {
      if (!entry) return;
      if (!grouped.has(entry.jobSiteId)) {
        grouped.set(entry.jobSiteId, []);
      }
      grouped.get(entry.jobSiteId)!.push(entry.data);
    });

    return grouped;
  }

  private async resolveVerificationImageUrl(
    filePath: unknown,
    fileCfg: FileConfig,
    s3Client: S3Client | null,
  ): Promise<string | null> {
    if (!filePath || typeof filePath !== 'string') return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    if (fileCfg.driver === FileDriver.LOCAL) {
      const backendDomain = (appConfig() as AppConfig).backendDomain ?? '';
      return `${backendDomain}${filePath}`;
    }

    if (
      (fileCfg.driver === FileDriver.S3 || fileCfg.driver === FileDriver.S3_PRESIGNED) &&
      s3Client
    ) {
      try {
        const command = new GetObjectCommand({
          Bucket: fileCfg.awsDefaultS3Bucket ?? '',
          Key: filePath,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch {
        return null;
      }
    }

    return filePath;
  }

  private hasValidCoordinates(latitude: unknown, longitude: unknown): boolean {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  private isRejectedConfidenceValue(image: WasteStreamImageEntity): boolean {
    const rawConfidence = image.adminConfidenceOverride ?? image.aiConfidenceLevel;
    if (rawConfidence === null || rawConfidence === undefined) return false;
    const confidence = Number(rawConfidence);
    return Number.isFinite(confidence) && confidence <= 0;
  }

  /**
   * Fetches job sites for a user
   */
  private async fetchJobSites(userId: number, jobSiteId?: number) {
    const jobSiteWhere: { client: { id: number }; id?: number } = {
      client: { id: userId },
    };
    if (jobSiteId) {
      jobSiteWhere.id = jobSiteId;
    }

    return await this.jobSitesRepository.find({
      where: jobSiteWhere,
      relations: {
        jobSiteDetails: true,
        client: true,
        address: true,
      },
      withDeleted: true,
    });
  }

  /**
   * Fetches waste streams data with all relations, excluding the heavy dumpsters
   * relation (use fetchDumpsterAggregates instead for tonnage/count).
   */
  private async fetchWasteStreamsData(jobSiteIds: number[]) {
    return await this.jobSitesWasteStreamsRepository.find({
      relations: {
        wasteStream: true,
        wasteStreamLocations: {
          location: {
            address: true,
          },
          powerplant: {
            address: true,
          },
        },
        jobSite: {
          jobSiteDetails: true,
          client: true,
          address: true,
        },
      },
      where: {
        jobSite: { id: In(jobSiteIds) },
      },
      withDeleted: true,
    });
  }

  /**
   * Lean variant of fetchWasteStreamsData for the map-data-stats endpoint.
   * Uses loadEagerRelations: false to skip the 9 eager relations on the entity
   * (jobSite, wasteStream, location, powerplant, dumpster, hauler, wasteStreamType,
   * vessel, vesselOption) and loads only what's needed to compute tonnage, distance,
   * and CO2 stats. Reduces DB round-trips from ~20 down to ~5.
   */
  private async fetchWasteStreamsDataForStats(jobSiteIds: number[]) {
    return await this.jobSitesWasteStreamsRepository.find({
      loadEagerRelations: false,
      relations: {
        wasteStream: true,
        wasteStreamLocations: {
          location: true,
          powerplant: true,
        },
        jobSite: true,
      },
      where: {
        jobSite: { id: In(jobSiteIds) },
      },
      withDeleted: true,
    });
  }

  /**
   * Returns a map of wasteStreamId → { totalWeight, moved } using a single
   * GROUP BY query with an optional date filter applied at the DB level.
   * Runs in parallel with fetchWasteStreamsData to avoid sequential round-trips.
   */
  private async fetchDumpsterAggregates(
    jobSiteIds: number[],
    startDate?: string,
    endDate?: string,
  ): Promise<Map<number, { totalWeight: number; moved: number }>> {
    if (!jobSiteIds.length) return new Map();

    const joinCondition =
      startDate && endDate
        ? 'd.creationDate BETWEEN :startDate AND :endDate'
        : undefined;
    const joinParams =
      startDate && endDate
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : undefined;

    const qb = this.jobSitesWasteStreamsRepository
      .createQueryBuilder('jsws')
      .withDeleted()
      .select('jsws.id', 'wsId')
      .addSelect(
        'COALESCE(SUM(COALESCE(d.real_weight, d.estimated_weight)), 0)',
        'totalWeight',
      )
      .addSelect('COUNT(d.id)', 'moved')
      .where('jsws.jobSiteId IN (:...jobSiteIds)', { jobSiteIds })
      .groupBy('jsws.id');

    if (joinCondition) {
      qb.leftJoin(
        'jsws.jobSitesWasteStreamsDumpsters',
        'd',
        joinCondition,
        joinParams,
      );
    } else {
      qb.leftJoin('jsws.jobSitesWasteStreamsDumpsters', 'd');
    }

    const rows = await qb.getRawMany();
    return new Map(
      rows.map((r) => [
        Number(r.wsId),
        {
          totalWeight: Number(r.totalWeight) || 0,
          moved: Number(r.moved) || 0,
        },
      ]),
    );
  }

  /**
   * Formats date range for filtering
   */
  private formatDateRange(
    startDate?: string,
    endDate?: string,
  ): { start: string | null; end: string | null } {
    if (startDate && endDate) {
      return {
        start: format(new Date(startDate), 'yyyy-MM-dd'),
        end: format(new Date(endDate), 'yyyy-MM-dd'),
      };
    }
    return { start: null, end: null };
  }

  /**
   * Applies filters to waste streams data based on wasteType, materialDestinationType, and materialDestination
   */
  private applyWasteStreamFilters(
    wasteStreamsData: any[],
    wasteType?: string,
    materialDestinationType?: string,
    materialDestination?: number,
  ): any[] {
    let filteredData = wasteStreamsData;

    // Filter by waste type (waste stream name)
    if (wasteType && wasteType !== 'All') {
      filteredData = filteredData.filter((ws) => {
        return ws.wasteStream?.name?.toLowerCase() === wasteType.toLowerCase();
      });
    }

    // Filter by materialDestinationType and materialDestination
    if (materialDestinationType && materialDestination) {
      const isPowerplant =
        materialDestinationType.toLowerCase() === 'powerplant';

      filteredData = filteredData.filter((ws) => {
        if (!ws.wasteStreamLocations || ws.wasteStreamLocations.length === 0) {
          return false;
        }

        return ws.wasteStreamLocations.some((loc: any) => {
          if (isPowerplant) {
            // Match with powerplantId
            return loc.powerplantId === materialDestination;
          } else {
            // Match with locationId
            return loc.locationId === materialDestination;
          }
        });
      });
    }

    return filteredData;
  }

  /**
   * Extracts unique waste stream names
   */
  private extractUniqueWasteStreamNames(wasteStreamsData: any[]) {
    const wasteStreamNamesSet = new Set<string>();
    wasteStreamsData.forEach((ws) => {
      if (ws.wasteStream?.name) {
        wasteStreamNamesSet.add(ws.wasteStream.name);
      }
    });
    return Array.from(wasteStreamNamesSet).map((name) => ({ name }));
  }

  /**
   * Extracts unique processing and end locations
   */
  private extractLocations(wasteStreamsData: any[]) {
    const locationsMap = new Map<number, any>();
    const powerplantsMap = new Map<number, any>();

    wasteStreamsData.forEach((ws) => {
      if (ws.wasteStreamLocations) {
        ws.wasteStreamLocations.forEach((loc) => {
          if (loc.type === 1 || loc.type === 2) {
            this.addLocationToMap(loc, locationsMap, powerplantsMap);
          }
        });
      }
    });

    return [
      ...Array.from(locationsMap.values()),
      ...Array.from(powerplantsMap.values()),
    ];
  }

  /**
   * Adds a location to the appropriate map
   */
  private addLocationToMap(
    loc: any,
    locationsMap: Map<number, any>,
    powerplantsMap: Map<number, any>,
  ): void {
    if (loc.location) {
      const locationId = loc.location.id;
      if (!locationsMap.has(locationId)) {
        locationsMap.set(locationId, {
          id: loc.location.id,
          name: loc.location.name,
          address: this.getAddressData(loc.location.address as Address),
          entryType: 'location',
        });
      }
    } else if (loc.powerplant) {
      const powerplantId = loc.powerplant.id;
      if (!powerplantsMap.has(powerplantId)) {
        powerplantsMap.set(powerplantId, {
          id: loc.powerplant.id,
          name: loc.powerplant.name,
          entryType: 'powerplant',
          address: this.getAddressData(loc.powerplant.address as Address),
        });
      }
    }
  }

  /**
   * Processes and groups waste streams by job site
   */
  private processAndGroupWasteStreams(
    wasteStreamsData: any[],
    jobSites: any[],
    dateRange: { start: string | null; end: string | null },
    aggregates?: Map<number, { totalWeight: number; moved: number }>,
  ) {
    const jobSitesMap = this.initializeJobSitesMap(jobSites);

    wasteStreamsData.forEach((ws) => {
      const jobSiteId = ws.jobSite?.id;
      if (!jobSiteId || !jobSitesMap.has(jobSiteId)) return;

      const wasteStreamData = this.buildWasteStreamData(ws, dateRange, aggregates?.get(ws.id));
      jobSitesMap.get(jobSiteId)!.wasteStreams.push(wasteStreamData);
    });

    let jobSitesData = Array.from(jobSitesMap.values());

    // Filter out waste streams with 0 tons
    jobSitesData = jobSitesData.map((js) => ({
      ...js,
      wasteStreams: js.wasteStreams.filter((ws) => ws.tons > 0),
    }));

    // Filter out jobsites with no waste streams
    return jobSitesData.filter((js) => js.wasteStreams.length > 0);
  }

  /**
   * Initializes job sites map with basic data
   */
  private initializeJobSitesMap(jobSites: any[]): Map<number, any> {
    const jobSitesMap = new Map<number, any>();

    jobSites.forEach((jobSite) => {
      jobSitesMap.set(jobSite.id, {
        id: jobSite.id,
        title: jobSite.title,
        clientImageUrl: jobSite.client?.photo || null,
        address: jobSite.address
          ? {
              addressFull: jobSite.address.addressFull,
              addressLine1: jobSite.address.addressLine1,
              addressLine2: jobSite.address.addressLine2,
              city: jobSite.address.city,
              state: jobSite.address.state,
              postalCode: jobSite.address.postalCode,
              country: jobSite.address.country,
              lat: Number(jobSite.address.lat),
              lng: Number(jobSite.address.lng),
              placeId: jobSite.address.placeId,
            }
          : null,
        wasteStreams: [],
      });
    });

    return jobSitesMap;
  }

  /**
   * Builds waste stream data with filtering and calculations.
   * When `aggregate` is provided (from fetchDumpsterAggregates) the per-row
   * dumpster entities are not needed, avoiding the heavy entity hydration.
   */
  private buildWasteStreamData(
    ws: any,
    dateRange: { start: string | null; end: string | null },
    aggregate?: { totalWeight: number; moved: number },
  ) {
    const processingLocation = ws.wasteStreamLocations?.find(
      (loc) => loc.type === 1,
    );

    let totalTons: number;
    let moved: number;

    if (aggregate !== undefined) {
      // processingLocation guard mirrors calculateWasteStreamTons behaviour
      totalTons = processingLocation ? aggregate.totalWeight : 0;
      moved = aggregate.moved;
    } else {
      const filteredDumpsters = this.filterDumpstersByDate(
        ws.jobSitesWasteStreamsDumpsters || [],
        dateRange,
      );
      totalTons = this.calculateWasteStreamTons(
        filteredDumpsters,
        ws.wasteStreamLocations,
      );
      moved = filteredDumpsters.length;
    }

    return {
      id: ws.id,
      name: ws.wasteStream?.name || null,
      tons: Number(totalTons.toFixed(2)),
      moved: Number(moved),
      dumpster_type: ws.dumpster_key || null,
      dumpster_key: ws.dumpster_key || null,
      colorCode: ws.wasteStream?.colorCodeEst || null,
      dumpster_weight: ws.dumpster_weight || null,
      processingLocation: this.buildProcessingLocationData(
        processingLocation,
        totalTons,
      ),
      endLocations: this.extractEndLocations(ws.wasteStreamLocations),
    };
  }

  /**
   * Filters dumpsters by date range
   */
  private filterDumpstersByDate(
    dumpsters: any[],
    dateRange: { start: string | null; end: string | null },
  ) {
    if (!dateRange.start || !dateRange.end) {
      return dumpsters;
    }

    return dumpsters.filter((d) => {
      const dumpsterDate =
        d.creationDate instanceof Date
          ? d.creationDate
          : new Date(d.creationDate);
      return (
        dumpsterDate >= new Date(dateRange.start!) &&
        dumpsterDate <= new Date(dateRange.end!)
      );
    });
  }

  /**
   * Calculates total tons for a waste stream
   */
  private calculateWasteStreamTons(
    filteredDumpsters: any[],
    wasteStreamLocations: any[],
  ): number {
    if (filteredDumpsters.length === 0) return 0;

    const processingLocation = wasteStreamLocations?.find(
      (loc) => loc.type === 1,
    );

    // Don't count landfill tonnage
    const shouldCalculate = processingLocation;
    // || processingLocation.location?.type !== LocationsTypeEnum.Landfill;
    //added landfilll back to the map

    if (!shouldCalculate) return 0;

    return filteredDumpsters.reduce((total, d) => {
      return (
        total +
        (d.real_weight != null
          ? Number(d.real_weight)
          : Number(d.estimated_weight))
      );
    }, 0);
  }

  /**
   * Builds processing location data
   */
  private buildProcessingLocationData(
    processingLocation: any,
    totalTons: number,
  ) {
    if (!processingLocation) return null;

    const name =
      processingLocation.location?.name ||
      processingLocation.powerplant?.name ||
      null;

    return {
      id: processingLocation.id,
      name,
      type: processingLocation?.location?.type,
      locationToType: processingLocation?.location?.toType ?? null,
      distance: processingLocation.distance || null,
      locationId: processingLocation.locationId,
      powerplantId: processingLocation.powerplantId,
      tons: Number(totalTons.toFixed(2)),
      address: processingLocation.location?.address
        ? {
            addressFull: processingLocation.location.address.addressFull,
            addressLine1: processingLocation.location.address.addressLine1,
            addressLine2: processingLocation.location.address.addressLine2,
            city: processingLocation.location.address.city,
            state: processingLocation.location.address.state,
            postalCode: processingLocation.location.address.postalCode,
            country: processingLocation.location.address.country,
            lat: Number(processingLocation.location.address.lat),
            lng: Number(processingLocation.location.address.lng),
          }
        : null,
    };
  }

  /**
   * Extracts end locations (type 2)
   */
  private extractEndLocations(wasteStreamLocations: any[]): any[] {
    if (!wasteStreamLocations) return [];

    return wasteStreamLocations
      .filter((loc) => loc.type === 2)
      .map((loc) => ({
        id: loc.id,
        name: loc.location?.name || loc.powerplant?.name || null,
        type: loc.type,
        distance: loc.distance || null,
        locationId: loc.locationId,
        powerplantId: loc.powerplantId,
        address: loc.location?.address
          ? {
              addressFull: loc.location.address.addressFull,
              addressLine1: loc.location.address.addressLine1,
              addressLine2: loc.location.address.addressLine2,
              city: loc.location.address.city,
              state: loc.location.address.state,
              postalCode: loc.location.address.postalCode,
              country: loc.location.address.country,
              lat: Number(loc.location.address.lat),
              lng: Number(loc.location.address.lng),
            }
          : null,
      }));
  }

  /**
   * Calculates total tonnage from all job sites
   */
  private calculateTotalTonnage(jobSitesData: any[]): number {
    let totalTonnage = 0;
    jobSitesData.forEach((js) => {
      js.wasteStreams.forEach((ws) => {
        // Mirror woodWaste() query logic: for WOOD WASTE, exclude streams whose
        // processing location is Recycling-only (no powerplant at either leg).
        // Non-wood-waste streams are always included as-is.
        if (ws.name?.toUpperCase() === 'WOOD WASTE') {
          const processingIsRecycling =
            ws.processingLocation?.type === LocationsTypeEnum['Recycling'];
          const hasPowerplant =
            ws.processingLocation?.powerplantId ||
            ws.endLocations?.some((loc) => loc.powerplantId);
          if (processingIsRecycling && !hasPowerplant) return;
        }
        totalTonnage += ws.tons || 0;
      });
    });
    return Number(totalTonnage.toFixed(2));
  }

  /**
   * Calculates total distance from all waste stream locations duplicate loc fix
   */
  private calculateTotalDistance(wasteStreamsData: any[]): number {
    let totalDistance = 0;
    const processedLocationIds = new Set<number>();
    const processedPoweplandIds = new Set<number>();

    wasteStreamsData.forEach((ws) => {
      if (ws.wasteStreamLocations) {
        ws.wasteStreamLocations.forEach((loc) => {
          // Skip if we've already processed this locationId
          if (loc.locationId && processedLocationIds.has(loc.locationId)) {
            return;
          }
          if (loc.powerplantId && processedPoweplandIds.has(loc.powerplantId)) {
            return;
          }

          if ((loc.type === 1 || loc.type === 2) && loc.distance) {
            totalDistance += Number(loc.distance);
          }
          if (loc.locationId) {
            processedLocationIds.add(loc.locationId);
          }
          if (loc.powerplantId) {
            processedPoweplandIds.add(loc.powerplantId);
          }
        });
      }
    });
    return Number(totalDistance.toFixed(2));
  }

  
  private calculateTotalDiverted(jobSitesData: any[]): number {
    let totalDiverted = 0;
    jobSitesData.forEach((js) => {
      js.wasteStreams.forEach((ws) => {
        if (ws.name?.toUpperCase() !== 'WOOD WASTE') return;

        const loc = ws.processingLocation;
        // Include if going to a power plant (no location type) or a location
        // that is NOT Landfill (1) or Recycling (2)
        const isDiverted =
          loc?.powerplantId ||
          (loc?.type !== undefined &&
            loc?.type !== null &&
            loc?.type !== LocationsTypeEnum['Landfill'] &&
            loc?.type !== LocationsTypeEnum['Recycling']);

        if (isDiverted) {
          totalDiverted += ws.tons || 0;
        }
      });
    });
    return totalDiverted;
  }

  private async calculateTotalCo2Avoided(
    jobSitesData: any[],
    startDate?: string,
    endDate?: string,
    user?: User,
    wasteStreamsData?: any[],
    aggregates?: Map<number, { totalWeight: number; moved: number }>,
  ): Promise<number> {
    const totalDiverted = this.calculateTotalDiverted(jobSitesData);
    const total_co2_diverted = Number((totalDiverted * 1.65).toFixed(2));

    let transportCo2 = 0;
    if (startDate && endDate && user) {
      if (wasteStreamsData && aggregates) {
        // Fast path: compute from already-loaded data — no extra DB queries
        transportCo2 = await this.calculateTransportCo2FromData(
          wasteStreamsData,
          aggregates,
        );
      } else {
        // Fallback: original path via JobSiteStats (fires 2 extra DB queries)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const formattedStartDate = format(start, 'yyyy-MM-dd');
        const formattedEndDate = format(end, 'yyyy-MM-dd');

        this.jobSiteStats.formattedStartDate = formattedStartDate;
        this.jobSiteStats.formattedEndDate = formattedEndDate;
        this.jobSiteStats.userId = this.getUserIdForJobSiteStats(user);
        this.jobSiteStats.userRoleId = user.role?.id;
        // JobSiteStats is a singleton — reset jobSiteId so transport CO2 is
        // calculated across ALL job sites, not scoped to a stale value left
        // over from a previous getDashboardTreeGraphDiversionStats call.
        this.jobSiteStats.jobSiteId = undefined;

        transportCo2 = await this.jobSiteStats.getWoodWasteTransportCo2();
      }
    }

    return Math.max(0, Math.round(total_co2_diverted) - transportCo2);
  }

  /**
   * Computes wood-waste transport CO2 from already-loaded waste stream data
   * and the dumpster aggregates map.  Replicates the logic of
   * JobSiteStats.getWoodWasteTransportCo2() without firing extra DB queries.
   */
  private async calculateTransportCo2FromData(
    wasteStreamsData: any[],
    aggregates: Map<number, { totalWeight: number; moved: number }>,
  ): Promise<number> {
    const getEmissionFactor = async (
      key: string,
      fallback: number,
    ): Promise<number> => {
      try {
        const f = await this.emissionFactorsService.findByKey(key);
        return Number(f.value);
      } catch {
        return fallback;
      }
    };

    const [rollOffEmissionFactor, semiEmissionFactor, averageSemiTonsPerLoad] =
      await Promise.all([
        getEmissionFactor('roll_off_emission_factor', 0.0026),
        getEmissionFactor('semi_emission_factor', 0.0016),
        getEmissionFactor('average_semi_tons_per_load', 28),
      ]);

    // --- Roll-off: mirrors woodWaste() filter ---
    // Streams where type=1 location is NOT Recycling OR type=1/2 has powerplant
    let rollOffTonMiles = 0;
    for (const ws of wasteStreamsData) {
      if (ws.wasteStream?.name?.toUpperCase() !== 'WOOD WASTE') continue;

      const qualifiesRollOff = ws.wasteStreamLocations?.some((loc: any) => {
        if (loc.type === 1) {
          return (
            loc.powerplant ||
            (loc.location &&
              loc.location.type !== LocationsTypeEnum['Recycling'])
          );
        }
        if (loc.type === 2) return !!loc.powerplant;
        return false;
      });
      if (!qualifiesRollOff) continue;

      const tons = aggregates.get(ws.id)?.totalWeight ?? 0;
      if (!tons) continue;

      const processingDistance =
        Number(
          ws.wasteStreamLocations?.find((l: any) => l.type === 1)?.distance,
        ) || 0;
      rollOffTonMiles += tons * processingDistance;
    }
    const distance1 = rollOffTonMiles * rollOffEmissionFactor;

    // --- Semi: mirrors getWoodWasteDistance2() filter ---
    // Streams where type=1 has Wood Waste Process location AND type=2 is
    // Reman / Industrial Product / powerplant
    let semiLoadMiles = 0;
    for (const ws of wasteStreamsData) {
      if (ws.wasteStream?.name?.toUpperCase() !== 'WOOD WASTE') continue;

      const qualifiesSemi = ws.wasteStreamLocations?.some((loc: any) => {
        if (
          loc.type === 1 &&
          loc.location?.type === LocationsTypeEnum['Wood Waste Process']
        )
          return true;
        if (loc.type === 2) {
          return (
            loc.powerplant ||
            loc.location?.type === LocationsTypeEnum['ReManufacturing'] ||
            loc.location?.type === LocationsTypeEnum['Industrial Product']
          );
        }
        return false;
      });
      if (!qualifiesSemi) continue;

      const tons = aggregates.get(ws.id)?.totalWeight ?? 0;
      if (!tons) continue;

      const offTakeDistance =
        Number(
          ws.wasteStreamLocations?.find((l: any) => l.type === 2)?.distance,
        ) || 0;
      semiLoadMiles += Math.floor(tons / averageSemiTonsPerLoad) * offTakeDistance;
    }
    const distance2 = semiLoadMiles * semiEmissionFactor;

    return distance1 + distance2;
  }

  /**
   * Gets CO2 emission factor from database with fallback
   */
  private async getCo2EmissionFactor(): Promise<number> {
    try {
      const emissionFactor =
        await this.emissionFactorsService.findByKey('co2_avoided');
      return parseFloat(emissionFactor.value);
    } catch (error) {
      console.warn(
        'CO2 emission factor not found, using default value 0.4',
        error,
      );
      return 0.4; // Default fallback value
    }
  }

  /**
   * Calculates biomass tons (waste streams going to power plants)
   */
  private calculateBiomassTons(jobSitesData: any[]): number {
    let biomassTons = 0;
    jobSitesData.forEach((js) => {
      js.wasteStreams.forEach((ws) => {
        if (ws.name?.toUpperCase() !== 'WOOD WASTE') return;

        const goesToPowerPlant =
          ws.processingLocation?.powerplantId ||
          ws.processingLocation?.locationToType ===
            LocationsToTypesEnum.powerplant ||
          ws.endLocations?.some((loc: any) => loc.powerplantId);

        if (goesToPowerPlant) {
          biomassTons += ws.tons || 0;
        }
      });
    });
    return biomassTons;
  }
}
