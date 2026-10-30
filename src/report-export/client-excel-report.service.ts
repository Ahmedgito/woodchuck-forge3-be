import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { WasteStreamActivityMappingService } from 'src/waste-stream-activity-mapping/waste-stream-activity-mapping.service';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';
import { Between } from 'typeorm';

/**
 * One reporting bucket. Monthly (cumulative) reports produce one period per
 * calendar month since the job site started; weekly reports produce exactly one
 * period covering Monday to Sunday. Everything downstream — aggregation, rows,
 * formatting, filename — is driven off these periods, so both frequencies share
 * a single workbook writer and cannot drift apart.
 */
interface ReportPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

interface PeriodWasteStreamData {
  period: string;
  startDate: Date;
  endDate: Date;
  wasteStreams: {
    name: string;
    quantity: number;
  }[];
}

interface JobSitePeriodData {
  jobSite: JobSiteEntity;
  periodData: PeriodWasteStreamData[];
}

/** Filename parts and document metadata for a generated workbook. */
interface WorkbookNaming {
  prefix: 'cumulative_report' | 'weekly_report';
  dateSegment: string;
  creator: string;
}

@Injectable()
export class ClientExcelReportService {
  constructor(
    @InjectRepository(JobSiteEntity)
    private jobSiteRepository: Repository<JobSiteEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private wasteStreamsRepository: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(JobSiteWastestreamsDumpstersEntity)
    private dumpstersRepository: Repository<JobSiteWastestreamsDumpstersEntity>,
    private wasteStreamActivityMappingService: WasteStreamActivityMappingService,
  ) {}

  /**
   * Get all job sites for a client
   */
  async getJobSitesForClient(clientId: number): Promise<JobSiteEntity[]> {
    return this.jobSiteRepository.find({
      where: { client: { id: clientId } },
      relations: ['client'],
      order: { createdAt: 'asc' },
    });
  }

  /**
   * Aggregate a job site's waste stream tonnage into the supplied periods.
   *
   * `queryStart`/`queryEnd` bound the database read and are kept separate from
   * the period bounds on purpose: a cumulative report's final month bucket runs
   * to the end of the calendar month, but the data must stop at the report end
   * date, which may fall mid-month.
   */
  async getPeriodDataForJobSite(
    jobSiteId: number,
    periods: ReportPeriod[],
    queryStart: Date,
    queryEnd: Date,
  ): Promise<PeriodWasteStreamData[]> {
    if (periods.length === 0) return [];

    // Get all waste streams for this job site
    await this.wasteStreamsRepository.find({
      where: { jobSite: { id: jobSiteId } },
      relations: ['wasteStream', 'jobSitesWasteStreamsDumpsters'],
    });

    // Format dates as strings first (matching getBarGraph approach)
    // This ensures consistent date handling with the dashboard
    const formattedStartDate = format(queryStart, 'yyyy-MM-dd');
    const formattedEndDate = format(queryEnd, 'yyyy-MM-dd');

    // Get all dumpsters for these waste streams within the date range
    // Using the same approach as getBarGraph: format as string then convert to Date
    // This ensures timezone consistency with dashboard queries
    const dumpsters = await this.dumpstersRepository.find({
      relations: {
        jobSiteWastestreams: {
          wasteStream: true,
          jobSite: true,
        },
      },
      where: {
        jobSiteWastestreams: {
          jobSite: { id: jobSiteId },
        },
        creationDate: Between(
          new Date(formattedStartDate),
          new Date(formattedEndDate + ' 23:59:59'), // Include full end date like getBarGraph does
        ),
      },
      withDeleted: true,
    });

    // One tonnage-by-waste-stream map per period, in period order.
    const periodTotals = periods.map(() => new Map<string, number>());

    dumpsters.forEach((dumpster) => {
      let creationDate: Date;
      if (dumpster.creationDate instanceof Date) {
        creationDate = dumpster.creationDate;
      } else if (typeof dumpster.creationDate === 'string') {
        creationDate = parseISO(dumpster.creationDate);
      } else {
        return; // Skip if date is invalid
      }

      const periodIndex = periods.findIndex(
        (p) => creationDate >= p.startDate && creationDate <= p.endDate,
      );
      if (periodIndex === -1) return; // Outside every reporting period

      const wasteStreamName =
        dumpster.jobSiteWastestreams?.wasteStream?.name || 'UNKNOWN';

      // Normalize waste stream names
      const normalizedName = this.normalizeWasteStreamName(wasteStreamName);

      const tonnage = dumpster.real_weight ?? dumpster.estimated_weight ?? 0;

      const totals = periodTotals[periodIndex];
      totals.set(normalizedName, (totals.get(normalizedName) || 0) + tonnage);
    });

    return periods.map((period, index) => ({
      period: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      wasteStreams: Array.from(periodTotals[index].entries()).map(
        ([name, quantity]) => ({ name, quantity }),
      ),
    }));
  }

  /**
   * Normalize waste stream names to match the mapping table
   */
  private normalizeWasteStreamName(name: string): string {
    const upperName = name.toUpperCase().trim();

    // Map variations to standard names
    if (upperName.includes('WOOD') && upperName.includes('WASTE')) {
      return 'WOOD WASTE';
    }
    if (upperName === 'METAL') {
      return 'METAL';
    }
    if (upperName === 'PLASTIC') {
      return 'PLASTIC';
    }
    if (upperName === 'CONCRETE') {
      return 'CONCRETE';
    }
    if (
      (upperName.includes('WASTE') && upperName.includes('HAULING')) ||
      upperName.includes('LANDFILL')
    ) {
      return 'WASTE HAULING + LANDFILL';
    }

    return upperName;
  }

  /**
   * The job sites a report covers: the single selected site for a job-site
   * report, every site of the client for a dashboard report.
   */
  private async resolveJobSites(
    clientId: number,
    jobSiteId?: number,
  ): Promise<JobSiteEntity[]> {
    const allJobSites = await this.getJobSitesForClient(clientId);
    return jobSiteId
      ? allJobSites.filter((js) => js.id === jobSiteId)
      : allJobSites;
  }

  /** The date a cumulative report starts collecting from for a job site. */
  private jobSiteStartDate(jobSite: JobSiteEntity): Date {
    // Prefer startDate, fall back to createdAt, or use current date as last resort
    let rawStartDate: Date | undefined;
    if (jobSite.startDate) {
      // Handle both Date objects and date strings from database
      rawStartDate =
        jobSite.startDate instanceof Date
          ? jobSite.startDate
          : typeof jobSite.startDate === 'string'
            ? parseISO(jobSite.startDate)
            : undefined;
    }

    if (!rawStartDate && jobSite.createdAt) {
      rawStartDate =
        jobSite.createdAt instanceof Date
          ? jobSite.createdAt
          : typeof jobSite.createdAt === 'string'
            ? parseISO(jobSite.createdAt)
            : undefined;
    }

    // Use start of month for the jobsite start date to align with monthly reporting
    // This ensures cumulative reports start from the beginning of the month when the jobsite started
    return rawStartDate ? startOfMonth(rawStartDate) : startOfMonth(new Date());
  }

  /** One bucket per calendar month between the two dates, inclusive. */
  private buildMonthlyPeriods(startDate: Date, endDate: Date): ReportPeriod[] {
    return eachMonthOfInterval({ start: startDate, end: endDate }).map(
      (monthStart) => ({
        label: format(monthStart, 'MMM-yy'),
        startDate: startOfMonth(monthStart),
        endDate: endOfMonth(monthStart),
      }),
    );
  }

  /**
   * Aggregate data by month for all job sites, from each site's start month
   * through the report end date.
   */
  async aggregateDataByMonth(
    clientId: number,
    reportEndDate: Date,
    jobSiteId?: number,
  ): Promise<JobSitePeriodData[]> {
    const jobSites = await this.resolveJobSites(clientId, jobSiteId);
    const jobSitesData: JobSitePeriodData[] = [];

    for (const jobSite of jobSites) {
      const startDate = this.jobSiteStartDate(jobSite);

      const periodData = await this.getPeriodDataForJobSite(
        jobSite.id,
        this.buildMonthlyPeriods(startDate, reportEndDate),
        startDate,
        reportEndDate,
      );

      jobSitesData.push({ jobSite, periodData });
    }

    return jobSitesData;
  }

  /**
   * Aggregate a single reporting week for all job sites. Unlike the cumulative
   * report, the job site's own start date is deliberately ignored — every tab
   * covers exactly the same Monday-to-Sunday window and no earlier history.
   */
  async aggregateDataByWeek(
    clientId: number,
    weekStart: Date,
    weekEnd: Date,
    jobSiteId?: number,
  ): Promise<JobSitePeriodData[]> {
    const jobSites = await this.resolveJobSites(clientId, jobSiteId);
    const periods: ReportPeriod[] = [
      {
        label: `${format(weekStart, 'yyyy-MM-dd')} - ${format(weekEnd, 'yyyy-MM-dd')}`,
        startDate: weekStart,
        endDate: weekEnd,
      },
    ];
    const jobSitesData: JobSitePeriodData[] = [];

    for (const jobSite of jobSites) {
      const periodData = await this.getPeriodDataForJobSite(
        jobSite.id,
        periods,
        weekStart,
        weekEnd,
      );

      jobSitesData.push({ jobSite, periodData });
    }

    return jobSitesData;
  }

  /**
   * Generate Excel file with tabs for each job site. Shared by the cumulative
   * and weekly flows so their columns and formatting stay identical.
   */
  async generateExcelWithTabs(
    jobSitesData: JobSitePeriodData[],
    outputPath: string,
    clientName: string,
    naming: WorkbookNaming,
    jobSiteId?: number,
  ): Promise<{ filename: string; path: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = naming.creator;
    workbook.created = new Date();

    const filename = this.buildFilename(naming, clientName, jobSiteId);

    // If no job sites, create a single sheet with message
    if (jobSitesData.length === 0) {
      const worksheet = workbook.addWorksheet('No Data');
      worksheet.addRow(['No job sites found for this client']);
      return this.writeWorkbook(workbook, outputPath, filename);
    }

    // Create a tab for each job site
    for (const { jobSite, periodData } of jobSitesData) {
      const sheetName = this.sanitizeSheetName(
        jobSite.title || `Job Site ${jobSite.id}`,
      );
      const worksheet = workbook.addWorksheet(sheetName);

      // Set headers
      const headers = [
        'Description',
        'Start Date',
        'End Date',
        'Quantity',
        'Unit',
        'Supplier',
        'Activity',
      ];

      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFBFBFBF' },
      };

      // Add data rows
      for (const period of periodData) {
        for (const wasteStream of period.wasteStreams) {
          if (wasteStream.quantity > 0) {
            const activity =
              await this.wasteStreamActivityMappingService.getActivity(
                wasteStream.name,
              );

            worksheet.addRow([
              wasteStream.name,
              format(period.startDate, 'yyyy-MM-dd'),
              format(period.endDate, 'yyyy-MM-dd'),
              wasteStream.quantity,
              'Tonnage',
              'Woodchuck',
              activity,
            ]);
          }
        }
      }

      // Auto-size columns
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    return this.writeWorkbook(workbook, outputPath, filename);
  }

  /**
   * A per-site suffix keeps job-site files unique on disk — two sites of the
   * same client generated for the same period would otherwise share a filename
   * and overwrite each other.
   */
  private buildFilename(
    naming: WorkbookNaming,
    clientName: string,
    jobSiteId?: number,
  ): string {
    const siteSuffix = jobSiteId ? `_jobsite_${jobSiteId}` : '';
    return `${naming.prefix}_${clientName}${siteSuffix}_${naming.dateSegment}.xlsx`;
  }

  private async writeWorkbook(
    workbook: ExcelJS.Workbook,
    outputPath: string,
    filename: string,
  ): Promise<{ filename: string; path: string }> {
    const fullPath = path.join(outputPath, filename);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await workbook.xlsx.writeFile(fullPath);

    return { filename, path: fullPath };
  }

  /**
   * Sanitize sheet name for Excel (max 31 chars, no special chars)
   */
  private sanitizeSheetName(name: string): string {
    let sanitized = name.replace(/[\\/:?*\[\]]/g, '').substring(0, 31);
    if (!sanitized || sanitized.trim().length === 0) {
      sanitized = 'Sheet';
    }
    return sanitized;
  }

  /** Display name for the client a report belongs to. */
  private async resolveClientName(clientId: number): Promise<string> {
    const jobSites = await this.getJobSitesForClient(clientId);
    return (
      jobSites[0]?.client?.name ||
      jobSites[0]?.client?.username ||
      `Client_${clientId}`
    );
  }

  /**
   * Generate the cumulative Excel report for a client: every month from each
   * job site's start month through `previousMonthEnd`.
   */
  async generateCumulativeExcel(
    clientId: number,
    previousMonthEnd: Date,
    outputPath: string,
    jobSiteId?: number,
  ): Promise<{ filename: string; path: string }> {
    const clientName = await this.resolveClientName(clientId);

    // Aggregate data by month. When jobSiteId is provided (job-site report),
    // the result is restricted to that single site.
    const jobSitesData = await this.aggregateDataByMonth(
      clientId,
      previousMonthEnd,
      jobSiteId,
    );

    return this.generateExcelWithTabs(
      jobSitesData,
      outputPath,
      clientName,
      {
        prefix: 'cumulative_report',
        dateSegment: format(new Date(), 'yyyy-MM-dd'),
        creator: 'Woodchuck Cumulative Report',
      },
      jobSiteId,
    );
  }

  /**
   * Generate the weekly Excel report for a client: the same workbook structure
   * as the cumulative report, holding only the Monday-to-Sunday period.
   */
  async generateWeeklyExcel(
    clientId: number,
    weekStart: Date,
    weekEnd: Date,
    outputPath: string,
    jobSiteId?: number,
  ): Promise<{ filename: string; path: string }> {
    const clientName = await this.resolveClientName(clientId);

    const jobSitesData = await this.aggregateDataByWeek(
      clientId,
      weekStart,
      weekEnd,
      jobSiteId,
    );

    return this.generateExcelWithTabs(
      jobSitesData,
      outputPath,
      clientName,
      {
        prefix: 'weekly_report',
        dateSegment: `${format(weekStart, 'yyyy-MM-dd')}_${format(weekEnd, 'yyyy-MM-dd')}`,
        creator: 'Woodchuck Weekly Report',
      },
      jobSiteId,
    );
  }
}
