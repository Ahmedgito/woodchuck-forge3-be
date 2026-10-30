import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { CreateJobSiteDto } from './dto/create-job-site.dto';
import { NullableType } from '../utils/types/nullable.type';
// import { FilterUserDto, SortUserDto } from './dto/query-job-site.dto';
import { JobSiteRepository } from './infrastructure/persistence/job-site.repository';
import { DeepPartial } from 'src/utils/types/deep-partial.type';
import { JobSite } from './domain/job-site';
import { StatusEnum } from 'src/statuses/statuses.enum';
// import { RoleEnum } from 'src/roles/roles.enum';
// import { FilesService } from 'src/files/files.service';
// import bcrypt from 'bcryptjs';
// import { AuthProvidersEnum } from 'src/auth/auth-providers.enum';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';
import { CreateDumpsterDto } from 'src/dumpster/dto/create-dumpster.dto';
import { UpdateDumpsterDto } from 'src/dumpster/dto/update-dumpster.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { Repository, In } from 'typeorm';
import { Dumpster } from 'src/dumpster/domain/dumpster';
import { DumpsterStatusEntity } from 'src/dumpster-status/infrastructure/persistence/relational/entities/dumpster-status.entity';
import { DumpsterRefusedMmrEntity } from 'src/dumpster-refused-mmr/infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { FilterJobSiteDto, SortJobSiteDto } from './dto/query-job-site.dto';
import { QueuesService } from 'src/queues/queues.service';
import { JobSiteDetailsEntity } from 'src/job-sites-details/infrastructure/persistence/entities/job-site-details.entity';
import { CreateJobSiteDetailsDto } from 'src/job-sites-details/dto/create-job-site-details.dto';
import { JobSiteEntity } from './infrastructure/persistence/relational/entities/job-site.entity';
import { UpdateJobSiteDetailsDto } from 'src/job-sites-details/dto/update-job-site-details.dto';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from 'src/roles/roles.enum';
import { JobsiteSubLocationEntity } from 'src/job-sites-sub-locations/infrastructure/persistence/relational/entities/job-sites-sub-locations.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';
import {
  ArchiveReportPlanDto,
  ArchiveRequestDto,
} from './dto/archive-report-request.dto';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { JobSitesWasteStreamsService } from 'src/job-sites-waste-streams/job-sites-waste-streams.service';
import { ReportSubscriptionsService } from 'src/report-subscriptions/report-subscriptions.service';
import { buildArchivePlan } from '../utils/build-archive-plan.util';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { ReportExportService } from 'src/report-export/report-export.service';
import { WasteStreamImagesService } from 'src/waste-stream-images/waste-stream-images.service';
import { CarbonCreditsService } from 'src/carbon-credits/carbon-credits.service';
import { getDateRangeMonths } from 'src/utils/get-date-range-months.util';
import { instanceToPlain } from 'class-transformer';
import deepResolvePromises from 'src/utils/deep-resolver';
import { getReportPeriodLabel } from 'src/utils/report-naming.util';

@Injectable()
export class JobSitesService {
  constructor(
    private readonly jobSitesRepository: JobSiteRepository,
    @InjectRepository(JobSiteEntity)
    private readonly newJobSitesRepository: Repository<JobSiteEntity>,
    @InjectRepository(DumpsterEntity)
    private dumpsterRepository: Repository<DumpsterEntity>,
    @InjectRepository(JobSiteDetailsEntity)
    private jobSiteDetailRepository: Repository<JobSiteDetailsEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(JobsiteSubLocationEntity)
    private jobsiteSubLocationRepository: Repository<JobsiteSubLocationEntity>,
    @InjectRepository(AddressEntity)
    private addressRepository: Repository<AddressEntity>,
    private queueService: QueuesService,
    private puppeteerService: PuppeteerService,
    private readonly mailService: MailService,
    private configService: ConfigService,
    private readonly jobSitesWasteStreamsService: JobSitesWasteStreamsService,
    private readonly reportSubscriptionsService: ReportSubscriptionsService,
    private readonly reportExportService: ReportExportService,
    private readonly wasteStreamImagesService: WasteStreamImagesService,
    private readonly carbonCreditsService: CarbonCreditsService,
  ) {}

  async create(createJobSiteDto: CreateJobSiteDto): Promise<JobSite> {
    const clonedPayload = {
      // status: StatusEnum.active,
      ...createJobSiteDto,
    };

    // eslint-disable-next-line prefer-const
    let statusObj = new StatusEntity();
    statusObj.id = StatusEnum.active;
    clonedPayload.status = statusObj;
    if (clonedPayload.status?.id) {
      const statusObject = Object.values(StatusEnum).includes(
        clonedPayload.status.id,
      );
      if (!statusObject) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              status: 'statusNotExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    return this.jobSitesRepository.create(clonedPayload);
  }

  async createJobSiteDetails(createDto: CreateJobSiteDetailsDto) {
    const payload: any = createDto;
    payload.client = { id: payload.clientId };
    const jobSite = await this.newJobSitesRepository.save(
      this.newJobSitesRepository.create(payload),
    );

    await this.jobSiteDetailRepository.save(
      this.jobSiteDetailRepository.create({
        jobSite: { id: jobSite['id'] },
        powerplants: { id: payload.powerplants },
        completionBy: payload.completionBy,
        size: payload.size,
        sustainabilityGoal: payload.sustainabilityGoal,
      }),
    );

    // Save address if provided
    if (payload.address) {
      const address = (await this.addressRepository.save(
        this.addressRepository.create({
          ...payload.address,
        }),
      )) as unknown as AddressEntity;
      // Attach address to job site via addressId
      await this.newJobSitesRepository.update(jobSite['id'], {
        address: { id: address.id } as any,
      });
    }

    // associate the default sub location with job site
    const defaultSubLocation = await this.dumpsterRepository.findOne({
      where: { isDefault: true },
    });
    if (defaultSubLocation) {
      const jobSiteSubLocation = this.jobsiteSubLocationRepository.create({
        jobSite: { id: jobSite['id'] },
        dumpster: { id: defaultSubLocation.id },
      });
      await this.jobsiteSubLocationRepository.save(jobSiteSubLocation);
    }

    return this.jobSitesRepository.findOne({ id: jobSite['id'] });
  }

  async updateJobSiteDetails(
    id: JobSite['id'],
    updateDto: UpdateJobSiteDetailsDto,
  ) {
    const payload: any = updateDto;
    await this.jobSitesRepository.update(id, payload);

    await this.jobSiteDetailRepository.update(
      { jobSite: { id: id } },
      {
        ...(payload.powerplants != undefined && {
          powerplants: { id: payload?.powerplants },
        }),
        completionBy: payload?.completionBy,
        size: payload?.size,
        sustainabilityGoal: payload?.sustainabilityGoal,
      },
    );

    // Update or create address if provided
    if (payload.address) {
      const jobSiteEntity = await this.newJobSitesRepository.findOne({
        where: { id },
        relations: ['address'],
      });

      const existingAddress = jobSiteEntity?.address
        ? await this.addressRepository.findOne({
            where: { id: jobSiteEntity.address.id },
          })
        : null;

      if (existingAddress) {
        // If placeId changed, delete old address and create a new one
        if (existingAddress.placeId !== payload.address.placeId) {
          await this.addressRepository.delete(existingAddress.id);
          const newAddress = (await this.addressRepository.save(
            this.addressRepository.create({
              ...payload.address,
            }),
          )) as unknown as AddressEntity;

          await this.newJobSitesRepository.update(id, {
            address: { id: newAddress.id } as any,
          });
        } else {
          // Same placeId: just update existing address fields
          await this.addressRepository.update(existingAddress.id, {
            ...payload.address,
          });
        }
      } else {
        const newAddress = (await this.addressRepository.save(
          this.addressRepository.create({
            ...payload.address,
          }),
        )) as unknown as AddressEntity;

        await this.newJobSitesRepository.update(id, {
          address: { id: newAddress.id } as any,
        });
      }
    }

    return this.jobSitesRepository.findOne({ id: id });
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterJobSiteDto | null;
    sortOptions?: SortJobSiteDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<JobSite[]> {
    return this.jobSitesRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  async findOne(
    fields: EntityCondition<JobSite>,
    loggedInUser: any,
    filters?: FilterJobSiteDto | null,
  ): Promise<NullableType<JobSite>> {
    const jobsite = await this.jobSitesRepository.findOne(fields, filters);
    if (!jobsite || process.env.IS_DEMO !== 'true') return jobsite;

    const user = await this.userRepository.findOne({
      where: { id: loggedInUser.id },
    });
    if (!user || !user.role) return jobsite;

    const { id, name, role } = user;
    if (role.id === RoleEnum.end_client) {
      Object.assign(jobsite, { endClientId: Number(id), endClientName: name });
    } else if (
      [RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing].includes(role.id)
    ) {
      Object.assign(jobsite, { clientId: Number(id), clientName: name });
    }

    return jobsite;
  }

  async getDumpsterStatus(id: JobSite['id']): Promise<object> {
    const jobSiteObject = await this.jobSitesRepository.findOne({
      id: id,
    });
    const obj = Object();
    obj.gates = [];
    let total_delivered = 0,
      total_miles = 0,
      total_waste = 0,
      total_refused = 0;

    if (jobSiteObject?.dumpsters) {
      for (let i = 0; i < jobSiteObject?.dumpsters.length; i++) {
        const dumpsterStatus = await DumpsterStatusEntity.find({
          where: {
            jobSite: { id: id },
            dumpsterLocationId: jobSiteObject?.dumpsters[i]['id'],
          },
        });
        // obj.gates.push(dumpsterStatus);
        const dumpsterArr: any[] = [];
        for (let j = 0; j < dumpsterStatus.length; j++) {
          const dumpsterRefusedMmr = await DumpsterRefusedMmrEntity.findOne({
            where: {
              jobSite: { id: id },
              dumpsterLocationId: jobSiteObject?.dumpsters[i]['id'],
              dumspterSize: Number(dumpsterStatus[j]['dumspterSize']),
            },
          });

          total_delivered += Number(dumpsterStatus[j]['dumspterCount']);

          total_miles += Number(dumpsterStatus[j]['miles']);
          total_waste += Number(dumpsterStatus[j]['waste']);
          total_refused += Number(dumpsterRefusedMmr?.dumspterCount);
          dumpsterArr.push({
            size: dumpsterStatus[j]['dumspterSize'],
            delivered: dumpsterStatus[j]['dumspterCount'],
            miles: dumpsterStatus[j]['miles'],
            waste: dumpsterStatus[j]['waste'],
            refused: Number(dumpsterRefusedMmr?.dumspterCount),
          });
        }
        if (dumpsterArr.length > 0) {
          obj.gates.push({
            name: jobSiteObject?.dumpsters[i]['sublocationName'],
            dumpster_location: jobSiteObject?.dumpsters[i]['id'],
            dumpster: dumpsterArr,
          });
        }
      }
    }

    obj.total_delivered = total_delivered;
    obj.total_miles = total_miles;
    obj.total_waste = total_waste;
    obj.total_refused = total_refused;
    return obj;
  }

  async update(
    id: JobSite['id'],
    payload: DeepPartial<JobSite>,
  ): Promise<JobSite | null> {
    const clonedPayload = { ...payload };

    if (clonedPayload.status?.id) {
      const statusObject = Object.values(StatusEnum).includes(
        clonedPayload.status.id,
      );
      if (!statusObject) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              status: 'statusNotExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    return this.jobSitesRepository.update(id, clonedPayload);
  }

  async softDelete(id: JobSite['id']): Promise<void> {
    await this.jobSitesRepository.softDelete(id);
    // Deactivate all report subscriptions for this job site
    try {
      await this.reportSubscriptionsService.deactivateAllForJobSite(id);
      console.log(`Deactivated all report subscriptions for job site ${id}`);
    } catch (err) {
      console.error(
        `Failed to deactivate report subscriptions for job site ${id}:`,
        err,
      );
    }
  }

  async createDumpster(
    id: JobSite['id'],
    createDumpsterDto: CreateDumpsterDto,
  ) {
    try {
      // Step 1: Create and save the dumpster
      const createDto = {
        ...createDumpsterDto,
        isDefault: false,
      };
      const dumpster = this.dumpsterRepository.create(createDto);
      const savedDumpster = await this.dumpsterRepository.save(dumpster);

      // Step 2: Create the junction entity
      const jobSiteSubLocation = this.jobsiteSubLocationRepository.create({
        jobSite: { id: id },
        dumpster: { id: savedDumpster.id },
      });

      await this.jobsiteSubLocationRepository.save(jobSiteSubLocation);

      return savedDumpster;
    } catch (exceptions) {
      throw exceptions;
    }
  }

  async updateDumpster(
    dumpsterId: Dumpster['id'],
    updateDumpsterDto: UpdateDumpsterDto,
  ) {
    try {
      await this.dumpsterRepository.update(
        { id: dumpsterId },
        updateDumpsterDto,
      );
      const getDumpster = await this.dumpsterRepository.findOne({
        where: {
          id: dumpsterId,
        },
        relations: {
          smsDumpsters: true,
        },
      });
      if (getDumpster?.smsDumpsters) {
        void this.queueService.globalDataUpdate({
          smsDumpsterIds: getDumpster.smsDumpsters,
        });
      }

      return getDumpster;
    } catch (exceptions) {
      throw new HttpException(exceptions.name, HttpStatus.BAD_REQUEST);
    }
  }

  async getDumpster(jobSiteId: JobSite['id']) {
    const jobsiteSubLocations = await this.jobsiteSubLocationRepository.find({
      where: { jobSite: { id: jobSiteId } },
      relations: ['dumpster'],
    });

    return jobsiteSubLocations.map((jsl) => jsl.dumpster);
  }

  sendArchiveReport(dto: ArchiveRequestDto, user?: any) {
    try {
      const formats = this.normalizeFormats(dto.formats);
      const isAdmin =
        user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms;

      this.queueService
        .generateReport({
          type: 'job-site',
          user,
          jobSiteId: dto.jobSiteId,
          months: dto.months,
          formats,
          isAdmin,
          useJobSiteNameInFilename: true,
        })
        .catch((error) => {
          console.error('Error queuing job site report generation:', error);
        });

      return {
        message:
          'Archive report generation started successfully. Reports will be emailed once ready.',
      };
    } catch (error) {
      console.error('Error sending archive report:', error);
      throw error;
    }
  }

  async exportArchiveReport(
    dto: any,
    user: any,
  ): Promise<{ jobId: string | number }> {
    const formats = this.normalizeFormats(dto.formats);
    const isAdmin =
      user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms;

    return this.reportExportService.exportReport({
      type: 'job-site',
      user,
      jobSiteId: dto.jobSiteId,
      months: dto.months,
      startDate: dto.startDate,
      endDate: dto.endDate,
      formats,
      isAdmin,
      useJobSiteNameInFilename: true,
      delivery: 'download',
    });
  }

  private normalizeFormats(
    formats?: ReportFormatEnum[] | ReportFormatEnum,
  ): ReportFormatEnum[] {
    if (!formats) return [ReportFormatEnum.PDF];
    const formatArray = Array.isArray(formats) ? formats : [formats];
    return [...new Set(formatArray)];
  }

  async generateJobSiteReportDataForRange(
    jobSiteId: number,
    startDate: string,
    endDate: string,
  ) {
    // Non-admin/non-CMS must not generate reports for restricted job sites
    // handle in next iteration
    // if (
    //   user &&
    //   user?.role?.id !== RoleEnum.admin &&
    //   user?.role?.id !== RoleEnum.cms
    // ) {
    //   const jobSiteForCheck = await this.jobSitesRepository.findOne({
    //     id: jobSiteId,
    //   });
    //   if (jobSiteForCheck?.isRestricted === true) {
    //     throw new HttpException(
    //       {
    //         status: HttpStatus.FORBIDDEN,
    //         errors: { jobSite: 'reportNotAllowedForRestrictedJobSite' },
    //       },
    //       HttpStatus.FORBIDDEN,
    //     );
    //   }
    // }

    const startForStats = startDate;
    const endForStats = endDate;
    const jobSite: any = await this.newJobSitesRepository.findOne({
      where: { id: jobSiteId },
    });
    const treeGraphStats =
      await this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const treeGraphDiversionStats =
      await this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const treeGraphWasteStreamsTypeStats =
      await this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const treeGraphWoodWasteDiversionStats =
      await this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const carbonCreditDollars = await this.getCarbonCreditsForReport(jobSiteId);
    const barGraph = await this.jobSitesWasteStreamsService.getBarGraph(
      startForStats,
      jobSiteId,
      endForStats,
    );

    // Build monthsGraph: dataByMonth keyed by 'MMM YYYY' with each month's barGraph
    const monthsGraph: { dataByMonth: Record<string, any> } = {
      dataByMonth: {},
    };
    try {
      const rangeMonths = getDateRangeMonths(startForStats, endForStats);
      for (const m of rangeMonths) {
        const label = new Intl.DateTimeFormat('en-US', {
          month: 'long',
          year: 'numeric',
        }).format(new Date(m.startDate + 'T00:00:00.000Z'));
        const monthBarGraph =
          await this.jobSitesWasteStreamsService.getBarGraph(
            m.startDate,
            jobSiteId,
            m.endDate,
          );
        monthsGraph.dataByMonth[label] = monthBarGraph;
      }
    } catch (e) {
      // non-fatal: monthsGraph is optional, continue without it
    }
    // Fetch all waste stream images for this job site and key them by jobsiteWasteStreamId.
    // Apply the same instanceToPlain + deepResolvePromises pipeline that the HTTP interceptors
    // run so that file.path becomes a real presigned S3 URL instead of a raw S3 key.
    const imagesList = await this.wasteStreamImagesService
      .findLatestByJobSiteId(jobSiteId)
      .catch(() => []);
    const imagesPlain: any[] = await deepResolvePromises(instanceToPlain(imagesList));
    const imagesByWasteStreamId: Record<number, any[]> = {};
    for (const img of imagesPlain) {
      const id = img.jobsiteWasteStreamId;
      if (!imagesByWasteStreamId[id]) imagesByWasteStreamId[id] = [];
      imagesByWasteStreamId[id].push(img);
    }

    const reportData = {
      jobSite,
      treeStats: {
        ...treeGraphStats,
        ...treeGraphDiversionStats,
        ...treeGraphWasteStreamsTypeStats,
        ...treeGraphWoodWasteDiversionStats,
        carbonCreditDollars,
        carbon_credit_dollars: carbonCreditDollars,
      },
      barGraph,
      monthsGraph,
      startDate,
      endDate,
      plans: [{ monthName: `${startDate}_${endDate}`, startDate, endDate }],
      imagesByWasteStreamId,
    } as any;
    return { reportData };
  }

  /**
   * Generate data for a single job site report plan (single month)
   */
  async generateSingleJobSiteReportData(
    jobSiteId: number,
    plan: { monthName: string; startDate: string; endDate: string },
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const startForStats = weeklyOverrides?.startDate || plan.startDate;
    const endForStats = weeklyOverrides?.endDate || plan.endDate;
    const jobSite: any = await this.jobSitesRepository.findOne({
      id: jobSiteId,
    });

    // Gather all report data for this plan
    const treeGraphStats =
      await this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const treeGraphDiversionStats =
      await this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const treeGraphWasteStreamsTypeStats =
      await this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const treeGraphWoodWasteDiversionStats =
      await this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(
        startForStats,
        endForStats,
        jobSiteId,
      );
    const carbonCreditDollars = await this.getCarbonCreditsForReport(jobSiteId);
    const barGraph = await this.jobSitesWasteStreamsService.getBarGraph(
      startForStats,
      jobSiteId,
      endForStats,
    );
    const monthGraph = {
      monthName: plan.monthName,
      startDate: startForStats,
      endDate: endForStats,
      data: barGraph,
    };

    // Fetch all waste stream images for this job site and key them by jobsiteWasteStreamId.
    // Apply the same instanceToPlain + deepResolvePromises pipeline that the HTTP interceptors
    // run so that file.path becomes a real presigned S3 URL instead of a raw S3 key.
    const imagesList = await this.wasteStreamImagesService
      .findLatestByJobSiteId(jobSiteId)
      .catch(() => []);
    const imagesPlain: any[] = await deepResolvePromises(instanceToPlain(imagesList));
    const imagesByWasteStreamId: Record<number, any[]> = {};
    for (const img of imagesPlain) {
      const id = img.jobsiteWasteStreamId;
      if (!imagesByWasteStreamId[id]) imagesByWasteStreamId[id] = [];
      imagesByWasteStreamId[id].push(img);
    }

    // Build the data object for the report
    const reportData = {
      jobSite,
      treeStats: {
        ...treeGraphStats,
        ...treeGraphDiversionStats,
        ...treeGraphWasteStreamsTypeStats,
        ...treeGraphWoodWasteDiversionStats,
        carbonCreditDollars,
        carbon_credit_dollars: carbonCreditDollars,
      },
      barGraph,
      monthGraph,
      plans: [plan],
      imagesByWasteStreamId,
      ...(weeklyOverrides?.weekly
        ? {
            weekly: true,
            started: startForStats,
            ended: endForStats,
          }
        : { weekly: false }),
    };

    return reportData;
  }

  private async getCarbonCreditsForReport(jobSiteId: number): Promise<number> {
    const carbonCredit = await this.carbonCreditsService
      .findByJobSiteId(jobSiteId)
      .catch(() => null);

    return Number(carbonCredit?.carbonCreditDollars ?? 0);
  }

  async getExportArchiveReportStatus(jobId: string | number, user: any) {
    return this.reportExportService.getExportStatus(jobId, user.id);
  }

  async getExportArchiveReportZip(jobId: string | number, user: any) {
    return this.reportExportService.getExportZip(jobId, user.id);
  }

  /**
   * Generate report data for job site (without PDF generation)
   */
  async generateJobSiteReportData(
    dto: ArchiveRequestDto,
    user?: any,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      // Non-admin/non-CMS must not generate reports for restricted job sites
      // handle in next iteration
      // if (
      //   user &&
      //   user?.role?.id !== RoleEnum.admin &&
      //   user?.role?.id !== RoleEnum.cms
      // ) {
      //   const jobSiteForCheck = await this.jobSitesRepository.findOne({
      //     id: dto.jobSiteId,
      //   });
      //   if (jobSiteForCheck?.isRestricted === true) {
      //     throw new HttpException(
      //       {
      //         status: HttpStatus.FORBIDDEN,
      //         errors: { jobSite: 'reportNotAllowedForRestrictedJobSite' },
      //       },
      //       HttpStatus.FORBIDDEN,
      //     );
      //   }
      // }

      const plans = buildArchivePlan(dto.months);
      const reportDataArray: any[] = [];

      // Fetch the job site once — it is the same for every month in the plan
      const jobSite: any = await this.jobSitesRepository.findOne({
        id: dto.jobSiteId,
      });
      const carbonCreditDollars = await this.getCarbonCreditsForReport(
        dto.jobSiteId,
      );

      for (const plan of plans) {
        const startForStats = weeklyOverrides?.startDate || plan.startDate;
        const endForStats = weeklyOverrides?.endDate || plan.endDate;

        // All 5 DB queries are independent per month — run in parallel
        const [
          treeGraphStats,
          treeGraphDiversionStats,
          treeGraphWasteStreamsTypeStats,
          treeGraphWoodWasteDiversionStats,
          barGraph,
        ] = await Promise.all([
          this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(
            startForStats,
            endForStats,
            dto.jobSiteId,
          ),
          this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(
            startForStats,
            endForStats,
            dto.jobSiteId,
          ),
          this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(
            startForStats,
            endForStats,
            dto.jobSiteId,
          ),
          this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(
            startForStats,
            endForStats,
            dto.jobSiteId,
          ),
          this.jobSitesWasteStreamsService.getBarGraph(
            startForStats,
            dto.jobSiteId,
            endForStats,
          ),
        ]);

        const monthGraph = {
          monthName: plan.monthName,
          startDate: startForStats,
          endDate: endForStats,
          data: barGraph,
        };

        // Build the data object for the report
        const reportData = {
          jobSite,
          treeStats: {
            ...treeGraphStats,
            ...treeGraphDiversionStats,
            ...treeGraphWasteStreamsTypeStats,
            ...treeGraphWoodWasteDiversionStats,
            carbonCreditDollars,
            carbon_credit_dollars: carbonCreditDollars,
          },
          barGraph,
          monthGraph,
          startDate: startForStats,
          endDate: endForStats,
          plans: [plan],
          isAdmin:
            user?.role?.id === RoleEnum.admin ||
            user?.role?.id === RoleEnum.cms ||
            false,
          ...(weeklyOverrides?.weekly
            ? {
                weekly: true,
                started: startForStats,
                ended: endForStats,
              }
            : { weekly: false }),
        };

        reportDataArray.push(reportData);
      }

      return { user, dto, plans, reportDataArray };
    } catch (e) {
      console.error('Error in generateJobSiteReportData:', e);
      throw e;
    }
  }

  /**
   * Export job site report to PDF
   */
  async exportJobSiteReportToPdf(
    reportData: any,
    useJobSiteNameInFilename = false,
    isAdmin = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
    fullPagePdf?: boolean,
  ): Promise<{ filename: string; path: string }[]> {
    try {
      const attachments: { filename: string; path: string }[] = [];
      const frontendDomain = this.configService.get('app.frontendDomain', {
        infer: true,
      });

      // For range reports, use the cumulative reportData (rangeMonths is for Excel/CSV month-wise breakdown)
      // PDF generates a single cumulative report for the date range
      void rangeMonths; // Parameter accepted for consistency but not used in PDF generation
      for (const plan of reportData.plans) {
        const jobSite = reportData.jobSite;
        const url = frontendDomain + '/export/jobsites';
        // Generate pdfPath - use consistent naming with filename
        const monthName = plan.monthName || plan.month || '';
        const periodLabel = getReportPeriodLabel(monthName, weeklyOverrides);
        const pdfPath =
          useJobSiteNameInFilename && jobSite?.id && jobSite?.title
            ? `${jobSite.id}-${jobSite.title}-${periodLabel}.pdf`
            : `${periodLabel}.pdf`;
        const exportSelector = '.container.white-area';
        const waitForSelectors = [
          '#report-root',
          '.vessel-header',
          '#sankey-container--r0-',
        ];

        await this.puppeteerService.exportReportPageToPdf({
          url,
          data: reportData,
          injectEndpoint: '/api/jobsite-report-data',
          waitForSelectors,
          exportSelector,
          pdfPath,
          fullPagePdf,
        });

        // Choose filename based on context (should match pdfPath logic)
        const filename = this.buildJobSitePdfFilename(
          useJobSiteNameInFilename,
          jobSite,
          isAdmin,
          periodLabel,
        );
        attachments.push({ filename, path: pdfPath });
      }

      console.log('PDF reports generated:', attachments);
      return attachments;
    } catch (e) {
      console.error('Error in exportJobSiteReportToPdf:', e);
      throw e;
    }
  }

  async processArchiveReportInBackground(
    dto: ArchiveRequestDto,
    user?: any,
    useJobSiteNameInFilename = false,
    isAdmin = false,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      const {
        user: reportUser,
        dto: reportDto,
        plans,
        reportDataArray,
      } = await this.generateJobSiteReportData(dto, user, weeklyOverrides);

      const attachments = await this.generateJobSiteReportAttachments(
        reportDataArray,
        useJobSiteNameInFilename,
        isAdmin,
      );

      console.log('Archive reports processed:', attachments);
      return { user: reportUser, dto: reportDto, plans, attachments };
    } catch (error) {
      console.error('Error in processArchiveReportInBackground:', error);
      throw error;
    }
  }

  private async generateJobSiteReportAttachments(
    reportDataArray: any[],
    useJobSiteNameInFilename: boolean,
    isAdmin: boolean,
  ): Promise<{ filename: string; path: string }[]> {
    const attachments: { filename: string; path: string }[] = [];

    for (const reportData of reportDataArray) {
      const pdfAttachments = await this.exportJobSiteReportToPdf(
        reportData,
        useJobSiteNameInFilename,
        isAdmin,
      );
      attachments.push(...pdfAttachments);
    }

    return attachments;
  }

  private async sendArchiveReportToUser({
    user,
    dto,
    plans,
    attachments,
  }: {
    user: any;
    dto: ArchiveRequestDto;
    plans: ArchiveReportPlanDto[];
    attachments: { filename: string; path: string }[];
  }) {
    const fs = await import('fs');
    try {
      // Always fetch the latest user from the repository
      const reportUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      // Get job site details for user request
      const jobSite = await this.jobSitesRepository.findOne({
        id: dto.jobSiteId,
      });

      // Print attachment details before sending email
      for (const attachment of attachments) {
        try {
          const exists = await fs.promises
            .access(attachment.path, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false);
          if (exists) {
            const stat = await fs.promises.stat(attachment.path);
            console.log(
              `Attachment: filename='${attachment.filename}', path='${attachment.path}', exists=true, size=${stat.size} bytes`,
            );
          } else {
            console.warn(
              `Attachment: filename='${attachment.filename}', path='${attachment.path}', exists=false`,
            );
          }
        } catch (err) {
          console.error(
            `Failed to check file for attachment: filename='${attachment.filename}', path='${attachment.path}'`,
            err,
          );
        }
      }

      await this.mailService.archiveReportsEmail({
        to: reportUser?.email as string,
        data: {
          name: reportUser?.name || 'User',
          jobSiteName: jobSite?.title || 'Job Site',
          reportMonths: plans.map((p) => p.monthName),
          attachments,
        },
      });

      // Delete files after email is sent
      for (const attachment of attachments) {
        try {
          await fs.promises.unlink(attachment.path);
          console.log(`Deleted file: ${attachment.path}`);
        } catch (err) {
          console.error(`Failed to delete file ${attachment.path}:`, err);
        }
      }

      console.log('Archive reports emailed and files deleted successfully');
    } catch (e) {
      console.error('Error in sendArchiveReportToUser:', e);
      throw e;
    }
  }

  async findAll(where: Partial<JobSite>): Promise<JobSite[]> {
    return this.jobSitesRepository.findAll(where);
  }

  public async closePuppeteerBrowser() {
    await PuppeteerService.closeBrowser();
  }

  /**
   * Builds the PDF filename for a job site report
   */
  private buildJobSitePdfFilename(
    useJobSiteNameInFilename: boolean,
    jobSite: any,
    isAdmin: boolean,
    periodLabel: string,
  ): string {
    if (useJobSiteNameInFilename && jobSite?.title) {
      if (isAdmin && jobSite?.clientName) {
        return `${periodLabel}.pdf`;
      }
      return `${jobSite.title}-${periodLabel}.pdf`;
    }
    return `${periodLabel}.pdf`;
  }
}
