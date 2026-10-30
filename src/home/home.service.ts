import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from 'src/config/config.type';
import { JobSitesWasteStreamsService } from 'src/job-sites-waste-streams/job-sites-waste-streams.service';
import { format } from 'date-fns';
import { JobSiteStats } from 'src/job-sites-waste-streams/utils/job-sites-stats';
import { User } from 'src/users/domain/user';
import { RoleEnum } from 'src/roles/roles.enum';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { FilterHomeDto } from './dto/query-home.dto';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { MailService } from 'src/mail/mail.service';
import { buildArchivePlan } from 'src/utils/build-archive-plan.util';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { JobSitesService } from 'src/job-sites/job-sites.service';
import { UsersService } from 'src/users/users.service';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import PuppeteerPool from 'src/puppeteer/puppeteer-pool';
import { QueuesService } from 'src/queues/queues.service';
import { ArchiveDashboardReportRequestDto } from './dto/archive-dashboard-report-request.dto';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { ReportExportService } from 'src/report-export/report-export.service';
import {
  safeDeleteAttachments,
  safeDeleteFile,
} from 'src/utils/file-cleanup.util';
import {
  getReportPeriodLabel,
  getReportPeriodPrefix,
} from 'src/utils/report-naming.util';
import { EmissionFactorsService } from 'src/emission-factors/emission-factors.service';
import { CarbonCreditsService } from 'src/carbon-credits/carbon-credits.service';

@Injectable()
export class HomeService {
  constructor(
    private configService: ConfigService<AllConfigType>,
    private readonly jobSiteService: JobSitesService,
    private readonly puppeteerService: PuppeteerService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService, // Inject UsersService
    private readonly jobSitesWasteStreamsService: JobSitesWasteStreamsService, // Inject JobSitesWasteStreamsService
    private readonly queuesService: QueuesService,
    private readonly reportExportService: ReportExportService,
    private readonly emissionFactorsService: EmissionFactorsService,
    private readonly jobSiteStats: JobSiteStats,
    private readonly carbonCreditsService: CarbonCreditsService,
  ) {}

  appInfo() {
    return { name: this.configService.get('app.name', { infer: true }) };
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
   * Fetch visible (non-restricted) job sites for a non-admin user.
   * End Client: job sites where endClientId = user and isRestricted = false.
   * GC/Manufacturer: job sites where client = user and isRestricted = false.
   */
  private async getVisibleJobSitesForUser(user: any): Promise<JobSiteEntity[]> {
    const isEndClient = user?.role?.id === RoleEnum.end_client;
    const userId = user?.isSubUser ? user?.parentUserId : user?.id;
    if (!userId) return [];

    const where: any = {};
    if (isEndClient) {
      where.endClientId = Number(userId);
    } else {
      where.client = { id: Number(userId) };
    }

    return JobSiteEntity.find({
      where,
      relations: ['client'],
      order: { startDate: 'asc' },
    });
  }

  /**
   * For End Client only: filter job sites to those whose construction company (client) is Pro.
   * Used so monthly breakdown is shown only for Pro-owned job sites.
   */
  private filterProJobSiteIdsOnly(
    jobSites: JobSiteEntity[],
    user: any,
  ): number[] {
    if (user?.role?.id !== RoleEnum.end_client)
      return jobSites.map((js) => js.id);
    return jobSites.map((js) => js.id);
    // Removed: .filter((js) => (js.client as any)?.isProAccount === true)
  }

  async getDashboardTreeGraphStats(
    startDate: string,
    endDate: string,
    user: User,
  ) {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.userId = this.getUserIdForJobSiteStats(user);

      this.jobSiteStats.userRoleId = user.role?.id;

      const woodWaste = (await this.jobSiteStats.woodWaste()).totalTons;
      const landfill = (await this.jobSiteStats.landfill()).totalTons;

      const remanufacturing = (await this.jobSiteStats.remanufacturing())
        .totalTons;

      const industrialProduct = (await this.jobSiteStats.industrialProduct())
        .totalTons;
      const biomassCleanEnergy = (await this.jobSiteStats.biomassCleanEnergy())
        .totalTons;
      const cleanEnergy = await this.jobSiteStats.cleanEnergy();

      // Fetch carbon credit aggregation based on user role
      let carbonCreditAggregation = { totalCo2Value: 0, totalCarbonCreditDollars: 0 };
      try {
        const isAdmin = user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;
        if (isAdmin) {
          carbonCreditAggregation = await this.carbonCreditsService.getAdminAggregation();
        } else {
          const userId = user.isSubUser && user.parentUserId ? user.parentUserId : user.id;
          if (userId) {
            carbonCreditAggregation = await this.carbonCreditsService.getClientAggregation(Number(userId));
          }
        }
      } catch (_) { /* carbon credits may not exist yet */ }

      return {
        wood_waste: woodWaste,
        landfill: landfill,
        clean_energy: biomassCleanEnergy || cleanEnergy,
        remanufacturing: remanufacturing,
        industrial_product: industrialProduct,
        biomass_clean_energy: biomassCleanEnergy,
        carbon_credit_co2: carbonCreditAggregation.totalCo2Value,
        carbon_credit_dollars: carbonCreditAggregation.totalCarbonCreditDollars,
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getDashboardTreeGraphDiversionStats(
    startDate: string,
    endDate: string,
    user: User,
  ) {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.userId = this.getUserIdForJobSiteStats(user);

      this.jobSiteStats.userRoleId = user.role?.id;

      // Run all independent queries in parallel to avoid sequential DB round-trips
      const [
        { totalTons: totalDiverted },
        cleanEnergy,
        avgSustainabilityGoal,
        { totalTons: totalWoodWaste },
        transportCo2,
        { totalTons: biomassTons },
        co2EmissionFactor,
      ] = await Promise.all([
        this.jobSiteStats.totalDiverted(),
        this.jobSiteStats.cleanEnergy(),
        this.jobSiteStats.avgSustainabilityGoal(),
        this.jobSiteStats.woodWaste(),
        this.jobSiteStats.getWoodWasteTransportCo2(),
        this.jobSiteStats.biomassCleanEnergy(),
        // Fetch CO2 emission factor alongside other queries instead of sequentially
        this.emissionFactorsService
          .findByKey('co2_avoided')
          .catch(() => null),
      ]);

      // co2Factor is available for future use; currently total_co2_diverted uses the fixed 1.65 multiplier
      const co2Factor = co2EmissionFactor
        ? parseFloat(co2EmissionFactor.value)
        : 0.4;

      // Compute chuckResult inline — avoids re-fetching woodWaste (×2) and totalDiverted inside chuckResult()
      const chuckResult =
        totalWoodWaste === 0
          ? 0
          : Number(((totalDiverted / totalWoodWaste) * 100).toFixed(2));

      const rejected = totalWoodWaste - totalDiverted;

      // Calculate diverted percentage
      const divertedPercentage =
        totalWoodWaste === 0
          ? 0
          : Number(((totalDiverted / totalWoodWaste) * 100).toFixed(2));

      const total_co2_diverted = Number((totalDiverted * 1.65).toFixed(2));
      const netCo2Avoided = Math.round(total_co2_diverted) - transportCo2;

      return {
        total_diverted: totalDiverted,
        total_co2_diverted,
        client_diversion_goal: avgSustainabilityGoal,
        chuck_result: chuckResult,
        clean_energy: biomassTons || cleanEnergy,
        diverted: 0,
        rejected: Number(rejected.toFixed(2)),
        diverted_percentage: divertedPercentage,
        transport_co2: transportCo2,
        net_co2_avoided: netCo2Avoided,
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getDiversionStats() {
    const totalDiverted = (await this.jobSiteStats.totalDiverted()).totalTons;

    return { total_co2_diverted: Number((totalDiverted * 1.65).toFixed(2)) };
  }

  async getDashboardTreeGraphWasteStreamsStats(
    startDate: string,
    endDate: string,
    user: User,
  ): Promise<object> {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.userId = this.getUserIdForJobSiteStats(user);

      this.jobSiteStats.userRoleId = user.role?.id;

      const cardBoard = (await this.jobSiteStats.cardBoard()).totalTons;
      const wasteHauling = (await this.jobSiteStats.wasteHauling()).totalTons;
      const metal = (await this.jobSiteStats.metal()).totalTons;
      const concrete = (await this.jobSiteStats.concrete()).totalTons;
      const plastic = (await this.jobSiteStats.plastic()).totalTons;

      const cardBoardCo2 =
        await this.jobSiteStats.getTypeTransportCo2('CARD BOARD');
      const wasteHaulingCo2 =
        await this.jobSiteStats.getTypeTransportCo2('WASTE HAULING');
      const metalCo2 = await this.jobSiteStats.getTypeTransportCo2('METAL');
      const concreteCo2 = await this.jobSiteStats.getTypeTransportCo2('CONCRETE');
      const plasticCo2 = await this.jobSiteStats.getTypeTransportCo2('PLASTIC');

      return {
        card_board: {
          delivered: cardBoard,
          delivered_to: 'Arbor Hills Material Recovery Facility',
          transport_co2: cardBoardCo2,
        },
        waste_hauling: {
          delivered: wasteHauling,
          delivered_to: 'Arbor Hills Landfill',
          transport_co2: wasteHaulingCo2,
        },
        metal: {
          delivered: metal,
          delivered_to: '',
          transport_co2: metalCo2,
        },
        concrete: {
          delivered: concrete,
          delivered_to: '',
          transport_co2: concreteCo2,
        },
        plastic: {
          delivered: plastic,
          delivered_to: '',
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
    user: User,
  ): Promise<object> {
    try {
      const start = new Date(startDate); // Parse the start date as an ISO date string
      const end = new Date(endDate); // Parse the start date as an ISO date string

      const formattedStartDate = format(start, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD
      const formattedEndDate = format(end, 'yyyy-MM-dd'); // Format start date as YYYY-MM-DD

      this.jobSiteStats.formattedStartDate = formattedStartDate;
      this.jobSiteStats.formattedEndDate = formattedEndDate;
      this.jobSiteStats.userId = this.getUserIdForJobSiteStats(user);

      this.jobSiteStats.userRoleId = user.role?.id;

      const chuckResult = await this.jobSiteStats.chuckResult();
      const woodWaste = (await this.jobSiteStats.woodWaste()).totalTons;
      const totalDiverted = (await this.jobSiteStats.totalDiverted()).totalTons;

      const getTotalWeight = (await this.jobSiteStats.getTotalWeight())
        .totalTons;
      const totalWasteDiversion =
        getTotalWeight === 0
          ? 0
          : Number(
              (
                ((await this.jobSiteStats.getTotalWeightWithoutLandfill())
                  .totalTons /
                  getTotalWeight) *
                100
              ).toFixed(2),
            );
      return {
        wood_waste_diverted: chuckResult,
        total_waste_diversion: totalDiverted,
        wood_waste_collected: woodWaste,
        total_wood_waste_diversion: totalWasteDiversion,
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getEndclientJobsiteOwners({
    user,
    filterOptions,
    paginationOptions,
  }: {
    user: User;
    filterOptions?: FilterHomeDto | null;
    paginationOptions: IPaginationOptions;
  }) {
    let where = '1 = 1';
    if (filterOptions?.search != undefined) {
      where = `(lower(user.name) like lower('%${filterOptions.search}%') OR lower(user.username) like lower('%${filterOptions.search}%'))`;
    }
    const userQuery = UserEntity.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.status', 'status')
      .leftJoin('job_site', 'job_site', 'user.id = job_site.clientId');

    userQuery.andWhere('user.roleId = :roleId', {
      roleId: RoleEnum.general_contractor,
    });

    if (process.env.IS_DEMO !== 'true') {
      userQuery.andWhere('job_site.endClientId = :endClientId', {
        endClientId: user.isSubUser ? user.parentUserId : user.id,
      });
    }

    // ✅ If demo mode is enabled, limit results to 1
    const limit = process.env.IS_DEMO === 'true' ? 1 : paginationOptions.limit;

    userQuery
      .andWhere(where)
      .take(limit)
      .skip((paginationOptions.page - 1) * paginationOptions.limit);

    return await userQuery.getMany();
  }

  async generateDashboardArchiveReport(
    plan: any,
    user: any,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ filename: string; path: string }[]> {
    try {
      // Gather dashboard data
      const treeGraphStats = await this.getDashboardTreeGraphStats(
        plan.startDate,
        plan.endDate,
        user,
      );
      const treeGraphDiversionStats =
        await this.getDashboardTreeGraphDiversionStats(
          plan.startDate,
          plan.endDate,
          user,
        );
      const treeGraphWasteStreamsTypeStats =
        await this.getDashboardTreeGraphWasteStreamsStats(
          plan.startDate,
          plan.endDate,
          user,
        );
      const treeGraphWoodWasteDiversionStats =
        await this.getDashboardWoodWasteDiversionStats(
          plan.startDate,
          plan.endDate,
          user,
        );

      // Fetch the first job site by startDate ascending
      const isAdmin =
        user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;
      const jobSite = isAdmin
        ? await JobSiteEntity.find({ order: { startDate: 'asc' } })
        : await this.getVisibleJobSitesForUser(user);

      const userPhoto = await this.usersService.getUserPhoto(
        user,
        user.role?.id,
      );
      const isGeneralContractor = user.role?.id === RoleEnum.general_contractor;
      const isManufacturer = user.role?.id === RoleEnum.manufacturer || user.role?.id === RoleEnum.wood_processing;
      const data: any = {
        role: user.role,
        photo: userPhoto,
        treeStats: {
          ...treeGraphStats,
          ...treeGraphDiversionStats,
          ...treeGraphWasteStreamsTypeStats,
          ...treeGraphWoodWasteDiversionStats,
        },
        jobSite,
        startDate: plan.startDate,
        endDate: plan.endDate,
        ...(weeklyOverrides?.weekly
          ? {
              weekly: true,
              started: weeklyOverrides.startDate,
              ended: weeklyOverrides.endDate,
            }
          : { weekly: false }),
      };

      let hasMonthsData = false;
      if (isAdmin) {
        // Fetch clients with role id 2, 5, and 7, sorted by updatedAt desc
        const clients = await this.usersService.findManyWithPagination({
          filterOptions: {
            roles: [
              { id: RoleEnum.general_contractor },
              { id: RoleEnum.manufacturer },
              { id: RoleEnum.wood_processing },
            ],
          },
          sortOptions: [{ orderBy: 'updatedAt', order: 'desc' }],
          paginationOptions: { page: 1, limit: 50 },
        });
        const clientIds = clients.map((c: any) => c.id);

        // Fetch waste stream data by month for all clientIds
        const barGraphData =
          (await this.jobSitesWasteStreamsService.getBarGraphByClient(
            plan.startDate,
            plan.endDate,
            clientIds,
            user,
          )) as any;

        const wasteStreamDataByMonth =
          (barGraphData && (barGraphData as any).jobSitesWasteStreams) || [];

        data.clients = clients;
        data.clientIds = clientIds;
        data.wasteStreamDataByMonth = wasteStreamDataByMonth;
        hasMonthsData = wasteStreamDataByMonth.length > 0;
      } else {
        // Not admin: fetch visible (non-restricted) job sites for this user (by role: end_client vs client)
        const userJobSites = await this.getVisibleJobSitesForUser(user);
        data.jobSites = userJobSites;
        data.jobsiteIds = userJobSites.map((js: any) => js.id);

        // Monthly breakdown: for End Client only include job sites whose construction company is Pro
        const jobSiteIdsForMonthlyBreakdown = this.filterProJobSiteIdsOnly(
          userJobSites,
          user,
        );
        const barGraphData =
          (await this.jobSitesWasteStreamsService.getBarGraphByJobSiteIds(
            plan.startDate,
            plan.endDate,
            jobSiteIdsForMonthlyBreakdown,
          )) as any;

        data.wasteStreamDataByMonth =
          (barGraphData && (barGraphData as any).jobSitesWasteStreams) || [];
        hasMonthsData = data.wasteStreamDataByMonth.length > 0;

        // if (isGeneralContractor || isManufacturer) {
        const mapData =
          await this.jobSitesWasteStreamsService.getMapDataForUser(
            user,
            plan.startDate,
            plan.endDate,
            data.jobsiteIds,
            plan.wasteType,
            plan.materialDestinations,
          );
        data.mapData = mapData;
        data.materialDestinationType = plan.materialDestinationType;
        data.materialDestinations = plan.materialDestinations;
        data.wasteType = plan.wasteType;
        // }
      }

      const frontendDomain = this.configService.get('app.frontendDomain', {
        infer: true,
      });
      const pdfPath = `dashboard-stats.pdf`;

      // Determine if we need to wait for Plotly graph (not needed for CC, manufacturer, or admin/CMS)
      const shouldWaitForPlotly = !(
        isGeneralContractor ||
        isManufacturer ||
        isAdmin
      );
      const waitForSelectors = shouldWaitForPlotly
        ? ['#report-root', '#sankey-container--r0-']
        : ['#report-root'];

      // Capture collapse PNGs on the same page after PDF generation (no second page load needed)
      let collapsePngPaths: string[] = [];
      await this.puppeteerService.exportReportPageToPdf({
        url: frontendDomain + `/export/dashboard`,
        data,
        injectEndpoint: '/api/dashboard-report-data',
        waitForSelectors,
        waitForTextNotIncludes: { selector: '#report-root', text: 'Waiting' },
        exportSelector: '.container.white-area.mt-5',
        pdfPath,
        shouldWaitForPlotly,
        afterPdf: hasMonthsData
          ? async (page) => {
              collapsePngPaths = await this.puppeteerService.screenshotElements(
                page,
                '.ant-collapse-item.ant-collapse-item-active',
                process.cwd(),
                'collapse-item',
              );
            }
          : undefined,
      });

      // Create a zip file with the PDF and PNGs inside
      const zipFilename = `${plan.monthName}.zip`;
      const zipPath = path.join(process.cwd(), zipFilename);
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);
        archive.pipe(output);
        archive.file(pdfPath, { name: path.basename(pdfPath) });
        for (let i = 0; i < collapsePngPaths.length; i++) {
          const pngPath = collapsePngPaths[i];
          archive.file(pngPath, { name: `${plan.monthName}.png` });
        }
        archive.finalize();
      });

      // Delete the PDF and PNG files after ZIP is created
      await safeDeleteFile(pdfPath);
      for (const pngPath of collapsePngPaths) {
        await safeDeleteFile(pngPath);
      }

      return [{ filename: zipFilename, path: zipPath }];
    } catch (error) {
      console.error('Error in generateDashboardArchiveReport:', error);
      throw error;
    }
  }

  /**
   * Generate dashboard report data (without PDF generation)
   */
  async generateDashboardReportData(
    dto: { months: string[] },
    user: any,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
    filterOptions?: {
      wasteType?: string;
      materialDestinationType?: string;
      materialDestinations?: { type: string; id: number }[];
    },
  ) {
    try {
      const plans = buildArchivePlan(dto.months);
      const reportDataArray: any[] = [];

      for (const plan of plans) {
        // If weekly overrides are provided, forward them to the page data as well by overriding plan dates
        const effectivePlan = {
          ...plan,
          startDate: weeklyOverrides?.startDate || plan.startDate,
          endDate: weeklyOverrides?.endDate || plan.endDate,
          wasteType: filterOptions?.wasteType,
          materialDestinationType: filterOptions?.materialDestinationType,
          materialDestinations: filterOptions?.materialDestinations,
        };

        const reportData = await this.generateSingleDashboardReportData(
          effectivePlan,
          user,
          weeklyOverrides,
        );

        reportDataArray.push(reportData);
      }

      return { user, dto, plans, reportDataArray };
    } catch (error) {
      console.error('Error in generateDashboardReportData:', error);
      throw error;
    }
  }

  /**
   * Generate data for a single dashboard report plan
   */
  async generateSingleDashboardReportData(
    plan: any,
    user: any,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    // Gather dashboard data
    const treeGraphStats = await this.getDashboardTreeGraphStats(
      plan.startDate,
      plan.endDate,
      user,
    );
    const treeGraphDiversionStats =
      await this.getDashboardTreeGraphDiversionStats(
        plan.startDate,
        plan.endDate,
        user,
      );
    const treeGraphWasteStreamsTypeStats =
      await this.getDashboardTreeGraphWasteStreamsStats(
        plan.startDate,
        plan.endDate,
        user,
      );
    const treeGraphWoodWasteDiversionStats =
      await this.getDashboardWoodWasteDiversionStats(
        plan.startDate,
        plan.endDate,
        user,
      );

    // Fetch the first job site by startDate ascending
    const jobSite = await JobSiteEntity.find({
      order: { startDate: 'asc' },
    });

    const userPhoto = await this.usersService.getUserPhoto(user, user.role?.id);

    // CMS reports are locked to the client's portal scope: Waste Type = "Wood Waste"
    // and Offtake = "All CMS" (all powerplant destinations). Unlike the live portal
    // (which applies this in the UI) and the manual export (which forwards the UI
    // filters), the scheduled/cron report path passes no filters and the backend
    // does not scope by role — so without this a CMS report would show All/All.
    // Enforce it here, the single point both the scheduled and range report paths
    // flow through, regardless of what the caller passed.
    const isCMSUser = user.role?.id === RoleEnum.cms;
    if (isCMSUser) {
      const powerplants = await PowerPlantsEntity.find();
      plan.wasteType = 'Wood Waste';
      plan.materialDestinations = powerplants.map((pp) => ({
        type: 'powerplant',
        id: pp.id,
      }));
    }

    const data: any = {
      role: user.role,
      photo: userPhoto,
      treeStats: {
        ...treeGraphStats,
        ...treeGraphDiversionStats,
        ...treeGraphWasteStreamsTypeStats,
        ...treeGraphWoodWasteDiversionStats,
      },
      jobSite,
      startDate: plan.startDate,
      endDate: plan.endDate,
      plans: [plan],
      ...(weeklyOverrides?.weekly
        ? {
            weekly: true,
            started: weeklyOverrides.startDate,
            ended: weeklyOverrides.endDate,
          }
        : { weekly: false }),
    };
    // Attach mapData for the roles whose report page renders the map (frontend
    // DISPLAY_MAP_ROLES: admin/cms/general_contractor/manufacturer/offtake, where
    // "offtake" is wood_processing). This mirrors the on-demand/range path
    // (generateDashboardReportDataForRange) so scheduled weekly/monthly reports stay
    // consistent with on-demand exports. Previously limited to general contractors
    // and manufacturers, which dropped the map from admin/cms weekly reports.
    // end_client and power_plant never render the map, so skip the (expensive)
    // map-stats computation for them.
    const displaysMap = [
      RoleEnum.admin,
      RoleEnum.cms,
      RoleEnum.general_contractor,
      RoleEnum.manufacturer,
      RoleEnum.wood_processing,
    ].includes(user.role?.id);
    if (displaysMap) {
      const mapData = await this.jobSitesWasteStreamsService.getMapDataForUser(
        user,
        plan.startDate,
        plan.endDate,
        undefined,
        plan.wasteType,
        plan.materialDestinations,
        true, // includeStats: compute heavy calculations for reporting
      );
      data.mapData = mapData;
      data.materialDestinationType = plan.materialDestinationType;
      data.materialDestinations = plan.materialDestinations;
      data.wasteType = plan.wasteType;

      // For CMS, surface the actual stored waste-stream name (e.g. exact casing) so
      // the report's Waste Type filter renders as selected, mirroring the live portal.
      if (isCMSUser) {
        const resolvedWasteType = (mapData as any)?.wasteStreams?.find(
          (ws: any) => ws?.name?.toLowerCase?.() === 'wood waste',
        )?.name;
        if (resolvedWasteType) {
          data.wasteType = resolvedWasteType;
        }
      }
    }

    return data;
  }

  /**
   * Get dashboard report months data for export report generation flow only
   * Fetches waste stream data by month to determine if collapse images should be generated
   * @param plan - Plan with startDate and endDate
   * @param user - User entity
   * @returns Object with wasteStreamDataByMonth, hasMonthsData, and client/jobSite data
   */
  async getDashboardReportMonthsData(
    plan: any,
    user: any,
  ): Promise<{
    wasteStreamDataByMonth: any[];
    hasMonthsData: boolean;
    clients?: any[];
    clientIds?: number[];
    jobSites?: any[];
    jobsiteIds?: number[];
  }> {
    const isAdmin =
      user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;
    let wasteStreamDataByMonth: any[] = [];
    let hasMonthsData = false;
    let clients: any[] | undefined;
    let clientIds: number[] | undefined;
    let jobSites: any[] | undefined;
    let jobsiteIds: number[] | undefined;

    if (isAdmin) {
      // Fetch clients with role id 2, 5, and 7, sorted by updatedAt desc
      clients = await this.usersService.findManyWithPagination({
        filterOptions: {
          roles: [
            { id: RoleEnum.general_contractor },
            { id: RoleEnum.manufacturer },
            { id: RoleEnum.wood_processing },
          ],
        },
        sortOptions: [{ orderBy: 'updatedAt', order: 'desc' }],
        paginationOptions: { page: 1, limit: 50 },
      });
      clientIds = clients.map((c: any) => c.id);

      // Fetch waste stream data by month for all clientIds
      const barGraphData =
        (await this.jobSitesWasteStreamsService.getBarGraphByClient(
          plan.startDate,
          plan.endDate,
          clientIds,
          user,
        )) as any;

      wasteStreamDataByMonth =
        (barGraphData && (barGraphData as any).jobSitesWasteStreams) || [];

      hasMonthsData = wasteStreamDataByMonth.length > 0;
    } else {
      // Not admin: fetch visible (non-restricted) job sites for this user (by role: end_client vs client)
      jobSites = await this.getVisibleJobSitesForUser(user);
      jobsiteIds = jobSites.map((js: any) => js.id);

      // Monthly breakdown: for End Client only include job sites whose construction company is Pro
      const jobSiteIdsForMonthlyBreakdown = this.filterProJobSiteIdsOnly(
        jobSites,
        user,
      );
      const barGraphData =
        (await this.jobSitesWasteStreamsService.getBarGraphByJobSiteIds(
          plan.startDate,
          plan.endDate,
          jobSiteIdsForMonthlyBreakdown,
        )) as any;

      wasteStreamDataByMonth =
        (barGraphData && (barGraphData as any).jobSitesWasteStreams) || [];
      hasMonthsData = wasteStreamDataByMonth.length > 0;
    }

    return {
      wasteStreamDataByMonth,
      hasMonthsData,
      clients,
      clientIds,
      jobSites,
      jobsiteIds,
    };
  }

  /**
   * Export dashboard report to PDF
   * @param reportData - Report data
   * @param rangeMonths - Optional array of month plans for range-based reports (to generate collapse images per month)
   * @param deleteSourceFiles - Whether to delete PDF and PNG files after ZIP creation (defaults to true for email delivery)
   */
  async exportDashboardReportToPdf(
    reportData: any,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
    deleteSourceFiles: boolean = true,
    createFolder: boolean = false,
    monthReportDataList?: any[],
    user?: any,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ filename: string; path: string }[]> {
    try {
      const frontendDomain = this.configService.get('app.frontendDomain', {
        infer: true,
      });
      // Generate a unique random session ID
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const pdfPath = `${getReportPeriodPrefix(weeklyOverrides)}dashboard-stats.pdf`;

      // Generate PDF and collapse PNGs in parallel
      const collapsePngPaths: string[] = [];
      const collapsePngMetadata: Array<{ path: string; name: string }> = [];

      // Determine if we need to wait for Plotly graph (not needed for CC, manufacturer, wood_processing, or admin/CMS)
      const isGeneralContractor =
        user?.role?.id === RoleEnum.general_contractor;
      const isManufacturer = user?.role?.id === RoleEnum.manufacturer || user?.role?.id === RoleEnum.wood_processing;
      const isAdmin =
        user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms;
      const shouldWaitForPlotly = !(
        isGeneralContractor ||
        isManufacturer ||
        isAdmin
      );
      const waitForSelectors = shouldWaitForPlotly
        ? ['#report-root', '#sankey-container--r0-']
        : ['#report-root'];

      // Start PNG generation setup — for single-month reports PNGs are captured
      // via afterPdf on the same page; for multi-month they need per-month data so
      // remain on a separate sequentially-reused page.
      let collapsePngsPromise: Promise<void> = Promise.resolve();

      if (reportData.hasMonthsData) {
        // If rangeMonths is provided, generate collapse images for each month in the range
        if (rangeMonths && rangeMonths.length > 0) {
          let monthReportDataArray: Array<{
            monthPlan: any;
            monthReportData: any;
          }>;

          // Use pre-generated monthReportDataList if provided, otherwise generate it
          if (monthReportDataList && monthReportDataList.length > 0) {
            // Transform pre-generated data to match PDF format (merge with reportData)
            monthReportDataArray = rangeMonths.map((monthPlan, index) => {
              const monthData = monthReportDataList[index];
              // Merge reportData with month-specific data (reuse treeStats from reportData)
              const monthReportData = {
                ...reportData,
                plans: [{ ...monthPlan }],
                startDate: monthPlan.startDate,
                endDate: monthPlan.endDate,
                // Use month-specific data from pre-generated list
                wasteStreamDataByMonth: monthData.wasteStreamDataByMonth || [],
                ...(monthData.clients && { clients: monthData.clients }),
                ...(monthData.clientIds && { clientIds: monthData.clientIds }),
                ...(monthData.jobSites && { jobSites: monthData.jobSites }),
                ...(monthData.jobsiteIds && {
                  jobsiteIds: monthData.jobsiteIds,
                }),
              };
              return { monthPlan, monthReportData };
            });
          } else {
            // Generate month-specific data only (parallel) and reuse reportData for the rest
            const monthReportDataPromises = rangeMonths.map(
              async (monthPlan) => {
                const userForMonth = reportData.user
                  ? reportData.user
                  : {
                      id: reportData.user?.id,
                      role: { id: reportData.role },
                    };

                // Only get month-specific waste stream data, reuse reportData (including treeStats) for everything else
                const {
                  wasteStreamDataByMonth,
                  clients,
                  clientIds,
                  jobSites,
                  jobsiteIds,
                } = await this.getDashboardReportMonthsData(
                  monthPlan,
                  userForMonth,
                );

                // Merge reportData with month-specific data (reuse treeStats from reportData)
                const monthReportData = {
                  ...reportData,
                  plans: [{ ...monthPlan }],
                  startDate: monthPlan.startDate,
                  endDate: monthPlan.endDate,
                  wasteStreamDataByMonth,
                  ...(clients && { clients }),
                  ...(clientIds && { clientIds }),
                  ...(jobSites && { jobSites }),
                  ...(jobsiteIds && { jobsiteIds }),
                };

                return { monthPlan, monthReportData };
              },
            );

            monthReportDataArray = await Promise.all(monthReportDataPromises);
          }

          // Generate all PNGs using a single page
          collapsePngsPromise = PuppeteerPool.usePage(async (page) => {
            const allResults: Array<{
              pngPaths: string[];
              metadata: Array<{ path: string; name: string }>;
            }> = [];
            const monthSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-graphs`;

            // Process each month sequentially using the same page
            for (const { monthPlan, monthReportData } of monthReportDataArray) {
              page.setDefaultTimeout(300000);
              page.setDefaultNavigationTimeout(120000);

              // domcontentloaded is sufficient — waitForFunction below gates actual content readiness
              await page.goto(
                frontendDomain +
                  '/export/dashboard?sessionId=' +
                  monthSessionId,
                {
                  waitUntil: 'domcontentloaded',
                },
              );
              await page.evaluate(
                async (data) => {
                  await fetch(
                    '/api/dashboard-report-data?sessionId=' + data.sessionId,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data.data),
                    },
                  );
                },
                { sessionId: monthSessionId, data: monthReportData },
              );
              await page.waitForFunction(
                (shouldWaitForPlotly) => {
                  const el = document.querySelector('#report-root');
                  if (
                    !el ||
                    !el.textContent ||
                    el.textContent.includes('Waiting')
                  ) {
                    return false;
                  }
                  // For CC and manufacturer, don't wait for Plotly graph
                  if (!shouldWaitForPlotly) {
                    return true;
                  }
                  // For other roles, wait for Plotly graph
                  const treeGraph = document.querySelector(
                    '#sankey-container--r0-',
                  );
                  return treeGraph && treeGraph.textContent;
                },
                { timeout: 120000 },
                shouldWaitForPlotly,
              );
              // Use the DRY screenshotElements method. Collapse PNGs are
              // supplementary — if the expanded panel never renders for a given
              // month, skip that month's capture instead of failing the report.
              let monthPngPaths: string[] = [];
              try {
                monthPngPaths = await this.puppeteerService.screenshotElements(
                  page,
                  '.ant-collapse-item.ant-collapse-item-active',
                  process.cwd(),
                  `collapse-item-${monthPlan.monthName.replace(/\s+/g, '-')}`,
                  20000,
                );
              } catch (err) {
                console.warn(
                  `[Dashboard PDF] Skipping collapse PNG capture for ${monthPlan.monthName} (selector not found): ${
                    (err as Error)?.message
                  }`,
                );
              }

              await page.evaluate(async (sessionId) => {
                await fetch(
                  `/api/dashboard-report-reset?sessionId=${sessionId}`,
                  {
                    method: 'POST',
                  },
                );
              }, monthSessionId);

              // Add metadata for each PNG with the month name
              const metadata: Array<{ path: string; name: string }> = [];
              for (const pngPath of monthPngPaths) {
                metadata.push({
                  path: pngPath,
                  name: `${getReportPeriodLabel(monthPlan.monthName, weeklyOverrides)}.png`,
                });
              }
              allResults.push({ pngPaths: monthPngPaths, metadata });
            }

            return allResults;
          }).then((results) => {
            for (const { pngPaths, metadata } of results) {
              collapsePngPaths.push(...pngPaths);
              collapsePngMetadata.push(...metadata);
            }
          });
        }
        // Single-month PNG capture is handled via afterPdf below (no separate page needed)
      }

      // PDF generation — for single-month reports, collapse PNGs are captured on the same
      // page via afterPdf (avoids a second page load, injection, and waitForFunction cycle).
      // For multi-month reports, collapsePngsPromise above handles per-month PNG capture.
      const pdfPromise = this.puppeteerService.exportReportPageToPdf({
        url: frontendDomain + `/export/dashboard?sessionId=${sessionId}`,
        data: reportData,
        injectEndpoint: '/api/dashboard-report-data?sessionId=' + sessionId,
        waitForSelectors,
        waitForTextNotIncludes: { selector: '#report-root', text: 'Waiting' },
        exportSelector: '.container.white-area.mt-5',
        pdfPath,
        shouldWaitForPlotly,
        afterPdf:
          reportData.hasMonthsData && !(rangeMonths && rangeMonths.length > 0)
            ? async (page) => {
                // The PDF has already been written at this point; the per-month
                // collapse PNGs are supplementary. If the expanded (active) collapse
                // panel never renders (e.g. an account whose report has no month
                // breakdown to expand), do NOT let it abort the whole PDF — log and
                // continue so the report still goes out.
                try {
                  const pngPaths =
                    await this.puppeteerService.screenshotElements(
                      page,
                      '.ant-collapse-item.ant-collapse-item-active',
                      process.cwd(),
                      'collapse-item',
                      20000,
                    );
                  collapsePngPaths.push(...pngPaths);
                  for (const pngPath of pngPaths) {
                    collapsePngMetadata.push({
                      path: pngPath,
                      name: `${getReportPeriodLabel(reportData.plans[0].monthName, weeklyOverrides)}.png`,
                    });
                  }
                } catch (err) {
                  console.warn(
                    `[Dashboard PDF] Skipping collapse PNG capture (selector not found): ${
                      (err as Error)?.message
                    }`,
                  );
                }
              }
            : undefined,
      });

      // Wait for PDF (and inline single-month PNGs) and multi-month PNGs to complete
      await Promise.all([pdfPromise, collapsePngsPromise]);

      if (createFolder) {
        // Create a folder with the PDF and PNGs inside
        const folderName = rangeMonths
          ? `dashboard_${reportData.startDate}_${reportData.endDate}`
          : reportData.plans[0].monthName;
        const folderPath = path.join(process.cwd(), folderName);

        // Create the folder if it doesn't exist
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        // Move PDF to folder
        const pdfInFolder = path.join(folderPath, path.basename(pdfPath));
        if (fs.existsSync(pdfPath)) {
          fs.copyFileSync(pdfPath, pdfInFolder);
        }

        // Move PNGs to folder
        for (const { path: pngPath, name } of collapsePngMetadata) {
          if (fs.existsSync(pngPath)) {
            const pngInFolder = path.join(folderPath, name);
            fs.copyFileSync(pngPath, pngInFolder);
          }
        }

        // Delete source files if requested
        if (deleteSourceFiles) {
          await safeDeleteFile(pdfPath);
          for (const pngPath of collapsePngPaths) {
            await safeDeleteFile(pngPath);
          }
        }

        return [{ filename: folderName, path: folderPath }];
      } else {
        // Create a zip file with the PDF and PNGs inside
        // const zipFilename = rangeMonths
        //   ? `dashboard_${reportData.startDate}_${reportData.endDate}.zip`
        //   : `${reportData.plans[0].monthName}.zip`;
        const zipFilename = `${getReportPeriodLabel(reportData.plans[0].monthName, weeklyOverrides)}.zip`;
        const zipPath = path.join(process.cwd(), zipFilename);
        await new Promise<void>((resolve, reject) => {
          const output = fs.createWriteStream(zipPath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          let resolved = false;

          output.on('close', () => {
            if (!resolved) {
              resolved = true;
              // Verify ZIP file exists and has content
              try {
                if (!fs.existsSync(zipPath)) {
                  reject(new Error('ZIP file was not created'));
                  return;
                }
                const stat = fs.statSync(zipPath);
                if (stat.size === 0) {
                  reject(new Error('ZIP file is empty'));
                  return;
                }
              } catch (err) {
                reject(err);
                return;
              }
              resolve();
            }
          });

          output.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              reject(err);
            }
          });

          archive.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              reject(err);
            }
          });

          archive.pipe(output);

          // Verify source files exist before adding to archive
          if (!fs.existsSync(pdfPath)) {
            reject(new Error(`PDF file not found: ${pdfPath}`));
            return;
          }
          archive.file(pdfPath, { name: path.basename('dashboard-stats.pdf') });

          // Use metadata to name PNGs correctly
          for (const { path: pngPath, name } of collapsePngMetadata) {
            if (!fs.existsSync(pngPath)) {
              console.warn(`PNG file not found, skipping: ${pngPath}`);
              continue;
            }
            archive.file(pngPath, { name });
          }

          archive.finalize();
        });

        // Verify ZIP was created successfully
        if (!fs.existsSync(zipPath)) {
          throw new Error('Failed to create ZIP file');
        }
        const zipStat = fs.statSync(zipPath);
        if (zipStat.size === 0) {
          throw new Error('Created ZIP file is empty');
        }

        // Delete the PDF and PNG files after ZIP is created only if requested (for email delivery)
        if (deleteSourceFiles) {
          await safeDeleteFile(pdfPath);
          for (const pngPath of collapsePngPaths) {
            await safeDeleteFile(pngPath);
          }
        }

        return [{ filename: zipFilename, path: zipPath }];
      }
    } catch (error) {
      console.error('Error in exportDashboardReportToPdf:', error);
      throw error;
    }
  }

  async processArchiveDashboardReportInBackground(
    dto: { months: string[] },
    user: any,
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
    filterOptions?: {
      wasteType?: string;
      materialDestinationType?: string;
      materialDestinations?: { type: string; id: number }[];
    },
  ) {
    try {
      const {
        user: reportUser,
        dto: reportDto,
        plans,
        reportDataArray,
      } = await this.generateDashboardReportData(
        dto,
        user,
        weeklyOverrides,
        filterOptions,
      );

      const attachments = await this.generateDashboardReportAttachments(
        reportDataArray,
        user,
      );

      return { user: reportUser, dto: reportDto, attachments, plans };
    } catch (error) {
      console.error(
        'Error in processArchiveDashboardReportInBackground:',
        error,
      );
      throw error;
    }
  }

  private async generateDashboardReportAttachments(
    reportDataArray: any[],
    user: any,
  ): Promise<{ filename: string; path: string }[]> {
    const attachments: { filename: string; path: string }[] = [];

    for (const reportData of reportDataArray) {
      const plan = reportData.plans?.[0] || {
        startDate: reportData.startDate,
        endDate: reportData.endDate,
      };

      await this.enrichReportDataWithMonthsData(reportData, plan, user);

      const pdfAttachments = await this.exportDashboardReportToPdf(reportData);
      attachments.push(...pdfAttachments);
    }

    return attachments;
  }

  async sendArchiveDashboardReportToUser({
    user,
    plans,
    attachments,
  }: {
    user: any;
    plans: any[];
    attachments: { filename: string; path: string }[];
  }) {
    try {
      // Always fetch the latest user from the database
      const userRepo = await UserEntity.findOne({ where: { id: user.id } });
      const email = userRepo?.email as string;
      const name = userRepo?.name || 'User';
      await this.mailService.archiveDashboardReportsEmail({
        to: email,
        data: {
          name,
          reportMonths: plans.map((p) => p.monthName),
          attachments,
        },
      });
      console.log('Dashboard archive reports emailed successfully');

      // Delete files after email is sent
      await safeDeleteAttachments(attachments);
      console.log('Dashboard archive report files deleted successfully');
    } catch (error) {
      console.error('Error in sendArchiveDashboardReportToUser:', error);
      throw error;
    }
  }

  sendArchiveReport(dto: ArchiveDashboardReportRequestDto, user: any) {
    try {
      const formats = this.normalizeFormats(dto.formats);
      const isAdmin =
        user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;

      this.queuesService
        .generateReport({
          type: 'dashboard',
          user,
          months: dto.months,
          formats,
          isAdmin,
          wasteType: dto.wasteType,
          materialDestinations: dto.materialDestinations,
        })
        .catch((error) => {
          console.error('Error queuing dashboard report generation:', error);
        });

      return {
        message:
          'Dashboard archive report generation started successfully. Reports will be emailed once ready.',
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
      user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;

    return this.reportExportService.exportReport({
      type: 'dashboard',
      user,
      months: dto.months,
      startDate: dto.startDate,
      endDate: dto.endDate,
      formats,
      isAdmin,
      delivery: 'download',
      wasteType: dto.wasteType,
      materialDestinations: dto.materialDestinations,
    });
  }

  async generateDashboardReportDataForRange(
    startDate: string,
    endDate: string,
    user: any,
    filterOptions?: {
      wasteType?: string;
      materialDestinationType?: string;
      materialDestinations?: { type: string; id: number }[];
    },
  ) {
    const plan = {
      monthName: `${startDate}_${endDate}`,
      startDate,
      endDate,
      wasteType: filterOptions?.wasteType,
      materialDestinationType: filterOptions?.materialDestinationType,
      materialDestinations: filterOptions?.materialDestinations,
    } as any;

    const reportData = await this.generateSingleDashboardReportData(
      plan,
      user,
      { weekly: false },
    );

    reportData.user = user;
    await this.enrichReportDataWithMonthsData(reportData, plan, user);

    // Add mapData for general contractors and manufacturers
    // const isGeneralContractor = user.role?.id === RoleEnum.general_contractor;
    // const isManufacturer = user.role?.id === RoleEnum.manufacturer;

    // if (isGeneralContractor || isManufacturer) {
    const mapData = await this.jobSitesWasteStreamsService.getMapDataForUser(
      user,
      plan.startDate,
      plan.endDate,
      undefined,
      plan.wasteType,
      plan.materialDestinations,
      true, // includeStats: only compute heavy calculations for reporting
    );
    reportData.mapData = mapData;
    reportData.materialDestinationType = plan.materialDestinationType;
    reportData.materialDestinations = plan.materialDestinations;
    reportData.wasteType = plan.wasteType;
    // }

    console.log(
      'reportData sent to frontend:',
      JSON.stringify({
        materialDestinations: reportData.materialDestinations,
        wasteType: reportData.wasteType,
        materialDestinationType: reportData.materialDestinationType,
        mapData: reportData.mapData,
      }),
    );
    return { reportData };
  }

  private async enrichReportDataWithMonthsData(
    reportData: any,
    plan: any,
    user: any,
  ) {
    const monthsData = await this.getDashboardReportMonthsData(plan, user);
    Object.assign(reportData, {
      wasteStreamDataByMonth: monthsData.wasteStreamDataByMonth,
      hasMonthsData: monthsData.hasMonthsData,
      ...(monthsData.clients && { clients: monthsData.clients }),
      ...(monthsData.clientIds && { clientIds: monthsData.clientIds }),
      ...(monthsData.jobSites && { jobSites: monthsData.jobSites }),
      ...(monthsData.jobsiteIds && { jobsiteIds: monthsData.jobsiteIds }),
    });
  }

  private normalizeFormats(formats?: ReportFormatEnum[]): ReportFormatEnum[] {
    return formats ? [...new Set(formats)] : [ReportFormatEnum.PDF];
  }

  async getExportArchiveReportStatus(jobId: string | number, user: any) {
    return this.reportExportService.getExportStatus(jobId, user.id);
  }

  async getExportArchiveReportZip(jobId: string | number, user: any) {
    return this.reportExportService.getExportZip(jobId, user.id);
  }

  public async closePuppeteerBrowser() {
    await PuppeteerService.closeBrowser();
  }
}
