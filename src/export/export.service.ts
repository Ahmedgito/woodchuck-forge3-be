import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleEnum } from 'src/roles/roles.enum';
import { User } from 'src/users/domain/user';
import { HomeService } from 'src/home/home.service';
import { ExportUserFilterDto } from './dto/query-filter.dto';
import { JobSitesService } from 'src/job-sites/job-sites.service';
import { infinityPagination } from 'src/utils/infinity-pagination';
import { JobSitesWasteStreamsService } from 'src/job-sites-waste-streams/job-sites-waste-streams.service';
// import { AuthEmailLoginDto } from 'src/auth/dto/auth-email-login.dto';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly authService: AuthService,
    private readonly homeservice: HomeService,
    private readonly jobSitesService: JobSitesService,
    private readonly jobSitesWasteStreamsService: JobSitesWasteStreamsService,
    private readonly usersService: UsersService,
  ) {}

  getMonthRange(startDate: Date, endDate: Date) {
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    const months: any = [];
    const current = new Date(
      Date.UTC(startDate.getFullYear(), startDate.getMonth(), 1),
    );
    const last = new Date(
      Date.UTC(endDate.getFullYear(), endDate.getMonth(), 1),
    );

    while (current <= last) {
      const startOfMonth = new Date(
        Date.UTC(current.getFullYear(), current.getMonth(), 1),
      );
      const endOfMonth = new Date(
        Date.UTC(current.getFullYear(), current.getMonth() + 1, 0),
      ); // Last day of the month

      months.push({
        month: startOfMonth.toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        }),
        startDate: startOfMonth.toISOString().substring(0, 10), // formatted YYYY-MM-DD
        endDate: endOfMonth.toISOString().substring(0, 10),
      });

      // Move to the next month
      current.setUTCMonth(current.getUTCMonth() + 1);
    }

    return months;
  }

  private sanitizeExportUserResponse(raw: any) {
    if (!raw) return {};

    // --- Helper to map locations ---
    const mapLocations = (locations: any[] = []) =>
      locations.map((loc) => ({
        type: loc.type,
        typeLabel: loc.type === 1 ? 'Processing Location' : 'End Location',
        locationName: loc.location?.name,
        haulerName: loc.hauler?.name,
        powerplantName: loc.powerplant?.name || null,
        distance: loc.distance,
      }));

    // --- Helper to map cameras ---
    const mapCameras = (wasteStreamCameras: any) =>
      wasteStreamCameras
        ? {
            alertToName: wasteStreamCameras.alertToName,
            maxLevel: wasteStreamCameras.maxLevel,
            confidenceLevel: wasteStreamCameras.confidenceLevel,
            camera: wasteStreamCameras.camera
              ? {
                  name: wasteStreamCameras.camera.name,
                  cameraId: wasteStreamCameras.camera.cameraId,
                  ipAddress: wasteStreamCameras.camera.ipAddress,
                  url: wasteStreamCameras.camera.url,
                }
              : null,
            additionalCamera: wasteStreamCameras.additionalCamera
              ? {
                  name: wasteStreamCameras.additionalCamera.name,
                  cameraId: wasteStreamCameras.additionalCamera.cameraId,
                  ipAddress: wasteStreamCameras.additionalCamera.ipAddress,
                  url: wasteStreamCameras.additionalCamera.url,
                }
              : null,
          }
        : { camera: null, additionalCamera: null };

    // --- Helper to map dumpsters ---
    const mapDumpsters = (dumpsters: any[] = []) =>
      dumpsters.map((d) => ({
        creationDate: d.creationDate,
        estimated_weight: d.estimated_weight,
        real_weight: d.real_weight,
      }));

    const { dashboard, jobsites } = raw;

    return {
      dashboard, // keep dashboard as-is
      jobsites: (jobsites || []).map((js: any) => ({
        title: js.title,
        name: js.name,
        clientName: js.client?.companyName || js.clientName,
        clientUserName: js.clientUser?.fullName || js.clientUserName,
        phone: js.phone,
        email: js.email,
        address: js.address,
        status: js.status.name,
        startDate: js.startDate,
        completionBy: js.completionBy,
        size: js.size,
        sustainabilityGoal: js.sustainabilityGoal,

        // --- Job Site Waste Streams ---
        jobSiteWastestreams: (js.jobSiteWastestreams || []).map((ws: any) => ({
          wasteStream: ws.wasteStream?.name,
          wasteStreamType: ws.wasteStreamType?.name,
          vessel: ws.vessel?.name,
          vesselOptionValue: ws.vesselOption?.value,
          dumpster_sublocation: ws.dumpster_sublocation,
          dumpster_weight: ws.dumpster_weight,
          dumpster_key: ws.dumpster_key,
          dumpster_type: ws.dumpster_type,
          tons: ws.tons,
          moved: ws.moved,
          dumpster: {
            sublocationName: ws.dumpster?.sublocationName,
            distanceToMmr: ws.dumpster?.distanceToMmr,
            unit: ws.dumpster?.unit,
          },
          locations: mapLocations(ws.wasteStreamLocations),
          cameras: mapCameras(ws.wasteStreamCameras),
        })),

        // --- Sustainability Report ---
        sustainability_report: {
          wasteStreams: js.sustainability_report.wasteStreams,
          diversionStats: js.sustainability_report.diversionStats,
          wasteStreamTypeStats: js.sustainability_report.wasteStreamTypeStats,
          woodWasteDiversionStats:
            js.sustainability_report.woodWasteDiversionStats,
          barGraph: {
            month: js.sustainability_report.barGraph.month,
            total_tons: js.sustainability_report.barGraph.total_tons,
            total_moved: js.sustainability_report.barGraph.total_moved,
            tons_diverted: js.sustainability_report.barGraph.tons_diverted,
            waste_diversion: js.sustainability_report.barGraph.waste_diversion,
            wasteStreams: (
              js.sustainability_report.barGraph.jobSitesWasteStreams || []
            ).map((ws: any) => ({
              name: ws.name,
              tons: ws.tons,
              moved: ws.moved,
              dumpster_type: ws.dumpster_type,
              dumpster_weight: ws.dumpster_weight,
              wasteStream: ws.wasteStream.name,
              wasteStreamType: ws.wasteStreamType.name,
              locations: mapLocations(ws.wasteStreamLocations),
              dumpsters: mapDumpsters(ws.jobSitesWasteStreamsDumpsters),
            })),
          },
        },

        // --- Dumpster Graph by Month ---
        dumpsterGraphByMonth: (js.dumpsterGraphByMonth || []).map((d: any) => ({
          month: d.month,
          total_tons: d.total_tons,
          total_moved: d.total_moved,
          tons_diverted: d.tons_diverted,
          waste_diversion: d.waste_diversion,
          wasteStreams: (
            d.wasteStreamDumpsterData.jobSitesWasteStreams || []
          ).map((ws: any) => ({
            name: ws.name,
            tons: ws.tons,
            moved: ws.moved,
            dumpster_type: ws.dumpster_type,
            dumpster_weight: ws.dumpster_weight,
            wasteStream: ws.wasteStream.name,
            wasteStreamType: ws.wasteStreamType.name,
            locations: mapLocations(ws.wasteStreamLocations),
            dumpsters: mapDumpsters(ws.jobSitesWasteStreamsDumpsters),
          })),
        })),
      })),
    };
  }

  async exportUserByUserId(
    exportUserFilterDto: ExportUserFilterDto,
    userId: number,
  ) {
    // Validate user and allowed roles
    const user = (await this.usersService.findOne({
      id: userId,
    })) as any as User;
    const allowedRoles = [RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing];
    if (!user?.role?.id || !allowedRoles.includes(user.role.id)) {
      throw new UnauthorizedException();
    }

    // Reuse the same logic by faking a minimal login path
    const today = new Date();
    const start = new Date('1970-01-01').toISOString().split('T')[0];
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0))
      .toISOString()
      .split('T')[0];

    const { startDate = start, endDate = end } = exportUserFilterDto;
    const responseJSON: any = { dashboard: {}, jobsites: [] };

    // Dashboard stats
    const [treeStats, diversionStats, wasteStreamStats, woodWasteStats] =
      await Promise.all([
        this.homeservice.getDashboardTreeGraphStats(startDate, endDate, user),
        this.homeservice.getDashboardTreeGraphDiversionStats(
          startDate,
          endDate,
          user,
        ),
        this.homeservice.getDashboardTreeGraphWasteStreamsStats(
          startDate,
          endDate,
          user,
        ),
        this.homeservice.getDashboardWoodWasteDiversionStats(
          startDate,
          endDate,
          user,
        ),
      ]);

    Object.assign(responseJSON.dashboard, {
      treeStats,
      diversionStats,
      wasteStreamStats,
      woodWasteStats,
    });

    // Dumpster stats
    const jobSitesList = await infinityPagination(
      await this.jobSitesService.findManyWithPagination({
        filterOptions: { clientId: <number>user.id },
        sortOptions: [{ orderBy: 'startDate', order: 'ASC' }],
        paginationOptions: { page: 1, limit: 10 },
      }),
      { page: 1, limit: 10 },
    );
    if (!jobSitesList.data.length)
      return this.sanitizeExportUserResponse(responseJSON);

    const jobSites = await Promise.all(jobSitesList.data);
    const jobSiteIds = jobSites.map((jobSite) => jobSite.id);
    const firstDate = new Date(
      exportUserFilterDto.startDate ||
        jobSites[0].startDate ||
        jobSites[0].createdAt,
    );
    const lastDate = new Date(exportUserFilterDto.endDate || today);
    const months = this.getMonthRange(firstDate, lastDate);
    const wasteStreamsByMonth = await Promise.all(
      months.map(async (month) => {
        const jobSitesWasteStreamsResponse: any =
          await this.jobSitesWasteStreamsService.getBarGraphByJobSiteIds(
            month.startDate,
            month.endDate,
            jobSiteIds,
          );
        const jobSitesWasteStreams =
          jobSitesWasteStreamsResponse.jobSitesWasteStreams || [];
        return { month: month.month, wasteStreams: jobSitesWasteStreams };
      }),
    );
    responseJSON.dashboard.dashboardWasteStreams = wasteStreamsByMonth;

    // Jobsites
    const jobSitesData: any = [];
    for (const jobSite of jobSites) {
      const jobSiteId = jobSite.id;
      const jobSiteStartDate = new Date(
        exportUserFilterDto.startDate || jobSite.startDate || jobSite.createdAt,
      );
      const jobSiteEndDate = exportUserFilterDto.endDate
        ? new Date(exportUserFilterDto.endDate).toISOString().split('T')[0]
        : end;
      const startMonth = new Date(
        Date.UTC(
          jobSiteStartDate.getFullYear(),
          jobSiteStartDate.getMonth(),
          1,
        ),
      )
        .toISOString()
        .split('T')[0];

      const wasteStreams =
        await this.jobSitesWasteStreamsService.getDashboardTreeGraphStats(
          startMonth,
          jobSiteEndDate,
          jobSiteId,
        );
      const diversionStats =
        await this.jobSitesWasteStreamsService.getDashboardTreeGraphDiversionStats(
          startMonth,
          jobSiteEndDate,
          jobSiteId,
        );
      const wasteStreamTypeStats =
        await this.jobSitesWasteStreamsService.getDashboardTreeGraphWasteStreamsStats(
          startMonth,
          jobSiteEndDate,
          jobSiteId,
        );
      const woodWasteDiversionStats =
        await this.jobSitesWasteStreamsService.getDashboardWoodWasteDiversionStats(
          startMonth,
          jobSiteEndDate,
          jobSiteId,
        );
      const barGraph = await this.jobSitesWasteStreamsService.getBarGraph(
        startMonth,
        jobSiteId,
        jobSiteEndDate,
      );

      const monthRanges = this.getMonthRange(
        jobSiteStartDate,
        new Date(jobSiteEndDate),
      );
      const dumpsterGraphByMonth = await Promise.all(
        monthRanges.map(async (month) => {
          const wasteStreamDumpsterData =
            await this.jobSitesWasteStreamsService.getBarGraph(
              month.startDate,
              jobSiteId,
              month.endDate,
            );
          return { month: month.month, wasteStreamDumpsterData };
        }),
      );

      const wasteStreamsData: any =
        await this.jobSitesWasteStreamsService.findByJobSiteId(jobSite.id);
      const jobSiteWastestreams: any = wasteStreamsData.jobSiteWastestreams;

      jobSitesData.push({
        ...jobSite,
        sustainability_report: {
          wasteStreams,
          diversionStats,
          wasteStreamTypeStats,
          woodWasteDiversionStats,
          barGraph,
        },
        dumpsterGraphByMonth,
        jobSiteWastestreams,
      });
    }
    responseJSON.jobsites = jobSitesData;
    return this.sanitizeExportUserResponse(responseJSON);
  }
}
