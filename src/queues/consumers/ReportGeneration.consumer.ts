import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs';
import archiver from 'archiver';
import path from 'path';
import { JobSitesService } from 'src/job-sites/job-sites.service';
import { HomeService } from 'src/home/home.service';
import { MailService } from 'src/mail/mail.service';
import { ReportSubscriptionsService } from 'src/report-subscriptions/report-subscriptions.service';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { ExportFormatsService } from 'src/report-export/export-formats.service';
import { ClientExcelReportService } from 'src/report-export/client-excel-report.service';
import { ClientReportConfigService } from 'src/client-report-config/client-report-config.service';
import { WasteStreamImagesService } from 'src/waste-stream-images/waste-stream-images.service';
import { ReportLoggerService } from 'src/report-logger/report-logger.service';
import {
  createMonthlyZipFiles,
  createZipFromAttachments,
  MonthlyAttachments,
  AttachmentFile,
} from 'src/utils/zip-attachments.util';
import { CompressionExtensionEnum } from 'src/report-subscriptions/compression-extension.enum';
import {
  ReportDownloadLink,
  ReportS3StorageService,
} from 'src/report-downloads/report-s3-storage.service';
import { safeDeleteAttachments } from 'src/utils/file-cleanup.util';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { getDateRangeMonths } from 'src/utils/get-date-range-months.util';
import {
  endOfMonth,
  subMonths,
  format,
  startOfMonth,
  startOfDay,
  endOfDay,
  parseISO,
} from 'date-fns';
import { instanceToPlain } from 'class-transformer';
import deepResolvePromises from 'src/utils/deep-resolver';

export interface ReportJobData {
  type: 'job-site' | 'dashboard';
  user: any;
  jobSiteId?: number;
  jobSiteIds?: number[]; // For admin consolidated reports
  jobSiteFormatsMap?: Record<number, ReportFormatEnum[]>; // Map of jobSiteId -> formats for admin consolidated reports
  months: string[];
  startDate?: string;
  endDate?: string;
  formats?: ReportFormatEnum[];
  weeklyOverrides?: {
    weekly?: boolean;
    startDate?: string;
    endDate?: string;
  };
  isAdmin?: boolean;
  useJobSiteNameInFilename?: boolean;
  cron?: boolean;
  delivery?: 'email' | 'download' | 'both';
  compressionExtension?: CompressionExtensionEnum;
  /**
   * Addresses to CC on this report's email, merged from the subscription(s)
   * that produced it (report_subscriptions.reportCcEmails).
   */
  reportCcEmails?: string[];
  // Map data filter fields
  wasteType?: string;
  materialDestinationType?: string;
  materialDestinations?: { type: string; id: number }[];
}

@Processor('report-generation')
export class ReportGenerationConsumer {
  private readonly logger = new Logger(ReportGenerationConsumer.name);

  constructor(
    @Inject(forwardRef(() => JobSitesService))
    private readonly jobSitesService: JobSitesService,
    @Inject(forwardRef(() => HomeService))
    private readonly homeService: HomeService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => ReportSubscriptionsService))
    private readonly reportSubscriptionsService: ReportSubscriptionsService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly exportFormatsService: ExportFormatsService,
    private readonly clientExcelReportService: ClientExcelReportService,
    private readonly clientReportConfigService: ClientReportConfigService,
    private readonly wasteStreamImagesService: WasteStreamImagesService,
    private readonly reportLogger: ReportLoggerService,
    private readonly reportS3Storage: ReportS3StorageService,
  ) {}

  private getEffectiveExtension(jobData: ReportJobData): string {
    if (process.env.USE_ZIP_EXTENSION_BYPASS === 'true')
      return CompressionExtensionEnum.PIZ;
    return jobData.compressionExtension ?? CompressionExtensionEnum.ZIP;
  }

  /**
   * Builds the per-file deliverables for report delivery. Every generated
   * report file becomes its OWN download link — files are never bundled into a
   * wrapper archive. This matters because a dashboard PDF export is itself a
   * `.zip`, so bundling would nest a zip inside a zip. The uploader turns each
   * `.zip` into a ZIP link (plus a PIZ link for PIZ clients) and each plain
   * file (csv/xlsx) into a single direct link. Each deliverable carries a
   * human-friendly `displayName` used as the link text.
   */
  private buildMonthlyLinkDeliverables(
    monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
    weeklyOverrides?: {
      weekly?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ): AttachmentFile[] {
    // Every link is prefixed with the report date so all files in the email
    // share one date: a weekly report uses its week range, a monthly report the
    // first day of the current month (e.g. "07-01-2026").
    const reportDate = this.reportDateLabel(weeklyOverrides);
    const deliverables: AttachmentFile[] = [];

    for (const [monthKey, files] of Object.entries(monthlyAttachmentsMap)) {
      // Cumulative reports live in a "<yyyy-MM-dd>-cumulative" bucket.
      const isCumulative = /-cumulative$/i.test(monthKey);
      deliverables.push(
        ...this.decorateLinkDeliverables(files, reportDate, isCumulative),
      );
    }

    return deliverables;
  }

  /**
   * Attaches a human-friendly `displayName` (the download-link text) to each
   * report file, skipping any file that no longer exists on disk. Shared by the
   * monthly and range delivery flows.
   */
  private decorateLinkDeliverables(
    files: AttachmentFile[],
    reportDate: string,
    isCumulative = false,
  ): AttachmentFile[] {
    const deliverables: AttachmentFile[] = [];
    for (const file of files) {
      if (!file.path || !fs.existsSync(file.path)) continue;
      deliverables.push({
        ...file,
        displayName: this.buildFileLinkLabel(reportDate, file, isCumulative),
      });
    }
    return deliverables;
  }

  /**
   * Link text for a single report file, always prefixed with the report date.
   * Zip archives return "<date> <Format>" (e.g. "07-01-2026 PDF") — the uploader
   * appends " ZIP Report" / " PIZ Report" → "07-01-2026 PDF ZIP Report". Plain
   * files (csv/xlsx/pdf) are tagged "<date> <Format> Report", with a "Cumulative"
   * marker for cumulative reports (e.g. "07-01-2026 Cumulative Excel Report").
   */
  private buildFileLinkLabel(
    reportDate: string,
    file: AttachmentFile,
    isCumulative: boolean,
  ): string {
    const word = this.reportFormatWord(file.format);
    const isZip =
      path.extname(file.path).toLowerCase() ===
      `.${CompressionExtensionEnum.ZIP}`;
    // e.g. "07-01-2026 PDF"; the uploader appends " ZIP Report" / " PIZ Report".
    if (isZip) return [reportDate, word].filter(Boolean).join(' ');
    // e.g. "07-01-2026 Cumulative Excel Report" / "07-01-2026 CSV Report".
    return [reportDate, isCumulative ? 'Cumulative' : '', word, 'Report']
      .filter(Boolean)
      .join(' ');
  }

  /**
   * The date shown on download links. Weekly reports use their week range
   * ("<start>-<end>", e.g. "2026-07-06-2026-07-12"); monthly reports use the
   * first day of the current month (e.g. "07-01-2026").
   */
  private reportDateLabel(weeklyOverrides?: {
    weekly?: boolean;
    startDate?: string;
    endDate?: string;
  }): string {
    if (
      weeklyOverrides?.weekly &&
      weeklyOverrides.startDate &&
      weeklyOverrides.endDate
    ) {
      return `${weeklyOverrides.startDate}-${weeklyOverrides.endDate}`;
    }
    return format(startOfMonth(new Date()), 'MM-dd-yyyy');
  }

  private reportFormatWord(fmt?: ReportFormatEnum): string {
    switch (fmt) {
      case ReportFormatEnum.PDF:
        return 'PDF';
      case ReportFormatEnum.EXCEL:
        return 'Excel';
      case ReportFormatEnum.CSV:
        return 'CSV';
      default:
        return '';
    }
  }

  /**
   * Uploads the report files to the client-reports S3 bucket and returns
   * permanent download links to embed in the email. All reports are delivered
   * via download links (never email attachments), so an upload failure is fatal
   * — without the link the email would be empty (the Bull job retries).
   *
   * A `.zip` archive from a PIZ client is uploaded twice — once as `.zip` and
   * once as a `.piz` copy — so those recipients get both download links and can
   * use whichever their mail client / proxy allows. A ZIP client gets a single
   * `.zip` link. Non-archive files (e.g. a single cumulative `.xlsx`) are
   * uploaded once and linked directly regardless of the client's compression
   * setting.
   */
  private async uploadArchivesForLinkDelivery(
    zipFiles: AttachmentFile[],
    extension: string,
  ): Promise<ReportDownloadLink[]> {
    // PIZ clients receive both a .zip and a .piz link for every archive; every
    // other client receives a single .zip link.
    const includePiz = extension === CompressionExtensionEnum.PIZ;

    const links: ReportDownloadLink[] = [];
    for (const file of zipFiles) {
      // Prefer the deliverable's display label (e.g. the report date).
      const baseLabel =
        file.displayName ?? file.filename.replace(/\.[^.]+$/, '');
      const isZipArchive =
        path.extname(file.path).toLowerCase() ===
        `.${CompressionExtensionEnum.ZIP}`;

      if (!isZipArchive) {
        const uploaded = await this.reportS3Storage.uploadReportArchive(file);
        links.push({ filename: baseLabel, url: uploaded.downloadUrl });
        continue;
      }

      // 1) Original .zip
      const zipUpload = await this.reportS3Storage.uploadReportArchive(file);
      links.push({
        filename: `${baseLabel} ZIP Report`,
        url: zipUpload.downloadUrl,
      });

      if (!includePiz) {
        continue;
      }

      // 2) .piz copy of the same archive (PIZ clients only)
      const pizFile = this.createPizCopy(file);
      try {
        const pizUpload =
          await this.reportS3Storage.uploadReportArchive(pizFile);
        links.push({
          filename: `${baseLabel} PIZ Report`,
          url: pizUpload.downloadUrl,
        });
      } finally {
        await safeDeleteAttachments([pizFile]);
      }
    }
    return links;
  }

  /**
   * Creates a non-destructive `.piz` copy of a `.zip` archive on disk (the file
   * content is identical — only the extension differs) so the original `.zip`
   * remains available for its own upload/link.
   */
  private createPizCopy(zipFile: AttachmentFile): AttachmentFile {
    const dir = path.dirname(zipFile.path);
    const pathBase = path.basename(zipFile.path, path.extname(zipFile.path));
    const pizPath = path.join(
      dir,
      `${pathBase}.${CompressionExtensionEnum.PIZ}`,
    );
    fs.copyFileSync(zipFile.path, pizPath);

    const filenameBase = path.basename(
      zipFile.filename,
      path.extname(zipFile.filename),
    );
    return {
      ...zipFile,
      filename: `${filenameBase}.${CompressionExtensionEnum.PIZ}`,
      path: pizPath,
    };
  }

  /**
   * Builds a map of jobsiteWasteStreamId -> WasteStreamImage[] for a given job site.
   * Used to enrich CSV/Excel reports with image data.
   */
  private async buildWasteStreamImagesMap(
    jobSiteId: number,
  ): Promise<Record<number, any[]>> {
    try {
      const images =
        await this.wasteStreamImagesService.findLatestByJobSiteId(jobSiteId);
      // Apply the same instanceToPlain + deepResolvePromises pipeline used by the
      // HTTP interceptors so that file.path becomes a real presigned S3 URL
      // instead of the raw S3 key stored in the database.
      const imagesPlain: any[] = await deepResolvePromises(
        instanceToPlain(images),
      );
      const map: Record<number, any[]> = {};
      for (const img of imagesPlain) {
        if (!map[img.jobsiteWasteStreamId]) {
          map[img.jobsiteWasteStreamId] = [];
        }
        map[img.jobsiteWasteStreamId].push(img);
      }
      return map;
    } catch (err) {
      this.logger.warn(
        `Failed to fetch waste stream images for job site ${jobSiteId}: ${err.message}`,
      );
      return {};
    }
  }

  @Process('generate-report-job')
  async generateReport(job: Job<ReportJobData>) {
    const jobData = job.data;
    const startedAt = Date.now();
    const attemptInfo = `attempt ${job.attemptsMade + 1}/${job.opts?.attempts ?? 1}`;
    try {
      this.logger.log(
        `Processing report generation job ${job.id} for type: ${jobData.type}`,
      );
      void this.reportLogger.log(
        `Job ${job.id} started — type: ${jobData.type} | user: ${jobData.user?.email || jobData.user?.id} | ${attemptInfo}`,
        'ReportGenerationConsumer',
        {
          jobId: job.id,
          type: jobData.type,
          email: jobData.user?.email,
          userId: jobData.user?.id,
          jobSiteId: jobData.jobSiteId,
          jobSiteIds: jobData.jobSiteIds,
          formats: jobData.formats,
          months: jobData.months,
          weekly: !!jobData.weeklyOverrides?.weekly,
          isAdmin: jobData.isAdmin,
          delivery: jobData.delivery,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts?.attempts ?? 1,
        },
      );

      const result =
        jobData.type === 'job-site'
          ? await this.processJobSiteReport(jobData)
          : await this.processDashboardReport(jobData);

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `Report generation job ${job.id} completed successfully in ${durationMs}ms`,
      );
      void this.reportLogger.log(
        `Job ${job.id} completed — type: ${jobData.type} | user: ${jobData.user?.email || jobData.user?.id} | duration: ${durationMs}ms`,
        'ReportGenerationConsumer',
        {
          jobId: job.id,
          type: jobData.type,
          email: jobData.user?.email,
          userId: jobData.user?.id,
          jobSiteId: jobData.jobSiteId,
          durationMs,
        },
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger.error(
        `Error processing report generation job ${job.id} after ${durationMs}ms:`,
        error,
      );
      void this.reportLogger.error(
        `Job ${job.id} failed — type: ${jobData.type} | user: ${jobData.user?.email || jobData.user?.id} | duration: ${durationMs}ms | ${attemptInfo} | error: ${error?.message}`,
        'ReportGenerationConsumer',
        {
          jobId: job.id,
          type: jobData.type,
          email: jobData.user?.email,
          userId: jobData.user?.id,
          jobSiteId: jobData.jobSiteId,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts?.attempts ?? 1,
          durationMs,
          error: error?.message,
          stack: error?.stack,
        },
      );
      throw error;
    }
  }

  /**
   * Helper method to determine the month name based on weekly overrides or report data
   */
  private getMonthName(
    weeklyOverrides: ReportJobData['weeklyOverrides'],
    reportData: any,
  ): string {
    return weeklyOverrides?.weekly &&
      weeklyOverrides?.startDate &&
      weeklyOverrides?.endDate
      ? `${weeklyOverrides.startDate}-${weeklyOverrides.endDate}`
      : reportData.plans?.[0]?.monthName || 'Unknown';
  }

  /**
   * Helper method to process Excel/CSV format exports for job sites
   */
  private async processExcelCsvFormat(
    reportDataArray: any[],
    format: ReportFormatEnum,
    siteId: number,
    jobData: ReportJobData,
    siteMonthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
  ): Promise<void> {
    const shouldFilter = this.shouldFilterWasteStreamsForFormat(
      jobData,
      format,
    );
    for (const reportData of reportDataArray) {
      const jobSite = reportData.jobSite;
      const preparedReportData = shouldFilter
        ? this.cloneAndFilterReportData(reportData)
        : reportData;
      const monthName = this.getMonthName(jobData.weeklyOverrides, reportData);
      const formatResult = await this.exportFormatsService.exportReport(
        preparedReportData,
        format,
        process.cwd(),
        'job-site',
        monthName,
        jobSite?.title || `Job Site ${siteId}`,
      );

      // Add format information and group by month
      if (!siteMonthlyAttachmentsMap[monthName]) {
        siteMonthlyAttachmentsMap[monthName] = [];
      }

      // Handle both single file and array of files
      const files = Array.isArray(formatResult) ? formatResult : [formatResult];
      files.forEach((file) => {
        siteMonthlyAttachmentsMap[monthName].push({
          ...file,
          format,
        });
      });
    }
  }

  /**
   * Helper method to process Excel/CSV format exports for dashboard reports
   */
  private async processExcelCsvFormatDashboard(
    reportDataArray: any[],
    format: ReportFormatEnum,
    jobData: ReportJobData,
    monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
  ): Promise<void> {
    for (const reportData of reportDataArray) {
      const monthName = this.getMonthName(jobData.weeklyOverrides, reportData);
      const formatResult = await this.exportFormatsService.exportReport(
        reportData,
        format,
        process.cwd(),
        'dashboard',
        monthName,
        undefined,
      );

      // Add format information and group by month
      if (!monthlyAttachmentsMap[monthName]) {
        monthlyAttachmentsMap[monthName] = [];
      }

      // Handle both single file and array of files
      const files = Array.isArray(formatResult) ? formatResult : [formatResult];
      files.forEach((file) => {
        monthlyAttachmentsMap[monthName].push({
          ...file,
          format,
        });
      });
    }
  }

  private async processJobSiteReport(jobData: ReportJobData) {
    try {
      // export
      if (jobData.startDate && jobData.endDate) {
        return await this.processJobSiteRangeReport(jobData);
      }
      // archive and monthly report
      return await this.processJobSiteMonthlyReport(jobData);
    } catch (error) {
      this.logger.error(
        `Error processing job site report for job site ${jobData.jobSiteId}:`,
        error,
      );
      throw error;
    }
  }

  private async validateAndFetchUser(
    userId: number | string,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: Number(userId) },
      relations: ['role'],
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    if (!user.email) {
      throw new Error(`User with id ${userId} has no email address`);
    }

    return user;
  }

  private async processJobSiteRangeReport(jobData: ReportJobData) {
    const user = await this.validateAndFetchUser(jobData.user.id);

    let { reportData } =
      await this.jobSitesService.generateJobSiteReportDataForRange(
        jobData.jobSiteId!,
        jobData.startDate!,
        jobData.endDate!,
      );

    const rangeMonths = getDateRangeMonths(
      jobData.startDate!,
      jobData.endDate!,
    );

    reportData = { ...reportData, isAdmin: jobData.isAdmin };

    const formats = jobData.formats || [ReportFormatEnum.PDF];
    const attachments: AttachmentFile[] = [];

    for (const format of formats) {
      const shouldFilter = this.shouldFilterWasteStreamsForFormat(
        jobData,
        format,
      );
      if (format === ReportFormatEnum.PDF) {
        const pdfs = await this.jobSitesService.exportJobSiteReportToPdf(
          reportData,
          jobData.useJobSiteNameInFilename || false,
          jobData.isAdmin || false,
          rangeMonths,
          undefined,
          true,
        );
        attachments.push(...pdfs);
      } else {
        // Check cumulative for Excel in range job-site reports
        if (format === ReportFormatEnum.EXCEL) {
          const clientId =
            reportData.jobSite?.clientId ||
            reportData.jobSite?.client?.id ||
            null;
          if (clientId) {
            const isCumulative = await this.clientReportConfigService.isEnabled(
              Number(clientId),
            );
            if (isCumulative) {
              this.logger.log(
                `Client ${clientId} has cumulative reporting enabled, generating cumulative Excel for job-site range`,
              );
              const cumulativeResult = await this.generateCumulativeAttachment(
                Number(clientId),
                reportData.jobSite?.id,
              );
              attachments.push(cumulativeResult);
              continue;
            }
          }
        }
        if (
          rangeMonths &&
          rangeMonths.length > 0 &&
          (format === ReportFormatEnum.EXCEL || format === ReportFormatEnum.CSV)
        ) {
          const monthReportDataList = await Promise.all(
            rangeMonths.map(async (monthPlan) => {
              return this.jobSitesService.generateSingleJobSiteReportData(
                jobData.jobSiteId!,
                monthPlan,
                { weekly: false },
              );
            }),
          );

          const wasteStreamImagesMap = await this.buildWasteStreamImagesMap(
            jobData.jobSiteId!,
          );
          const exportPayload = {
            ...reportData,
            monthReportDataList,
            wasteStreamImagesMap,
          };
          const preparedPayload = shouldFilter
            ? this.cloneAndFilterReportData(exportPayload)
            : exportPayload;
          const out = await this.exportFormatsService.exportReport(
            preparedPayload,
            format,
            process.cwd(),
            'job-site',
            `${jobData.startDate}_${jobData.endDate}`,
            reportData.jobSite?.title || `Job Site ${jobData.jobSiteId}`,
            rangeMonths,
          );
          attachments.push(...(Array.isArray(out) ? out : [out]));
        } else {
          const monthName = `${jobData.startDate}_${jobData.endDate}`;
          const wasteStreamImagesMap = await this.buildWasteStreamImagesMap(
            jobData.jobSiteId!,
          );
          const basePayload = shouldFilter
            ? this.cloneAndFilterReportData(reportData)
            : reportData;
          const exportPayload = { ...basePayload, wasteStreamImagesMap };
          const out = await this.exportFormatsService.exportReport(
            exportPayload,
            format,
            process.cwd(),
            'job-site',
            monthName,
            reportData.jobSite?.title || `Job Site ${jobData.jobSiteId}`,
          );
          attachments.push(...(Array.isArray(out) ? out : [out]));
        }
      }
    }

    if (attachments.length === 0) {
      throw new Error('No artifacts generated for range report');
    }

    if (jobData.delivery !== 'download') {
      await this.sendJobSiteRangeReportEmail(
        user,
        reportData,
        jobData,
        attachments,
      );
      await safeDeleteAttachments(attachments);
      this.logger.log(
        `Deleted ${attachments.length} artifact files after email (download links) for job site range report`,
      );
    }

    if (jobData.delivery && jobData.delivery !== 'email') {
      return await this.createJobSiteRangeDownloadZip(jobData, attachments);
    }

    return;
  }

  private async sendJobSiteRangeReportEmail(
    user: any,
    reportData: any,
    jobData: ReportJobData,
    attachments: AttachmentFile[],
  ) {
    // Deliver the range report as download links (never attachments), using the
    // client's compression setting: a ZIP client gets one .zip link per file, a
    // PIZ client also gets a .piz link for each .zip archive.
    const reportDate = `${jobData.startDate}-${jobData.endDate}`;
    const deliverables = this.decorateLinkDeliverables(attachments, reportDate);
    const downloadLinks = await this.uploadArchivesForLinkDelivery(
      deliverables,
      this.getEffectiveExtension(jobData),
    );

    await this.mailService.archiveReportsEmail({
      to: user.email,
      cc: jobData.reportCcEmails,
      data: {
        name: user?.name || 'User',
        jobSiteName: reportData?.jobSite?.title || 'Job Site',
        reportMonths: [`${jobData.startDate} to ${jobData.endDate}`],
        downloadLinks,
      },
    });
  }

  private async createJobSiteRangeDownloadZip(
    jobData: ReportJobData,
    attachments: AttachmentFile[],
  ) {
    const outerZipName = `jobsite_${jobData.jobSiteId}_${jobData.startDate}_${jobData.endDate}.zip`;
    const [zipFile] = await createMonthlyZipFiles(
      [{ monthName: outerZipName.replace(/\.zip$/, ''), attachments }],
      'job-site',
      jobData.jobSiteId,
      process.cwd(),
      false,
    );
    return {
      zip: zipFile,
      artifacts: attachments.map((a) => a.path),
    } as any;
  }

  private async processJobSiteMonthlyReport(jobData: ReportJobData) {
    try {
      const user = await this.validateAndFetchUser(jobData.user.id);
      const jobSiteIdsToProcess = jobData.jobSiteIds || [jobData.jobSiteId!];
      const isAdminWithMultipleSites =
        jobData.isAdmin && jobSiteIdsToProcess.length > 1;

      const {
        adminZipFiles,
        monthlyAttachmentsMap,
        allReportDataArrays,
        reportMonths,
      } = await this.processAllJobSites(
        jobSiteIdsToProcess,
        jobData,
        user,
        isAdminWithMultipleSites ?? false,
      );

      const producedFileCount = isAdminWithMultipleSites
        ? adminZipFiles.length
        : Object.keys(monthlyAttachmentsMap).length;

      if (producedFileCount === 0) {
        throw new Error(
          'Report generation produced no files for any requested format.',
        );
      }

      this.logger.log(
        `Generated report files for ${jobSiteIdsToProcess.length} job site(s)`,
      );

      if (jobData.delivery !== 'download') {
        const effectiveExtension = this.getEffectiveExtension(jobData);

        // All reports are delivered as download links (never attachments).
        // Admin multi-site reports are already one ZIP per site; other reports
        // become per-file link deliverables (a dashboard PDF export is itself a
        // .zip, so we never bundle a wrapper archive around it).
        const emailZipFiles: AttachmentFile[] = isAdminWithMultipleSites
          ? adminZipFiles
          : this.buildMonthlyLinkDeliverables(
              monthlyAttachmentsMap,
              jobData.weeklyOverrides,
            );

        // Upload every file to S3 and email the download links. PIZ clients
        // additionally get a .piz link for each .zip archive.
        const downloadLinks = await this.uploadArchivesForLinkDelivery(
          emailZipFiles,
          effectiveExtension,
        );

        await this.sendJobSiteMonthlyReportEmail(
          user,
          jobData,
          jobSiteIdsToProcess,
          allReportDataArrays,
          reportMonths,
          downloadLinks,
        );
        this.logJobSiteReportCompletion(
          user,
          jobSiteIdsToProcess,
          jobData,
          emailZipFiles,
        );
        await safeDeleteAttachments(emailZipFiles);
        this.logger.log(
          `Deleted ${emailZipFiles.length} report files after email for job site report`,
        );
      }

      if (jobData.delivery && jobData.delivery !== 'email') {
        const monthlyZipFiles = isAdminWithMultipleSites
          ? []
          : await this.createMonthlyZipFilesForJobSite(
              monthlyAttachmentsMap,
              jobData,
            );
        return await this.createJobSiteMonthlyDownloadZip([
          ...adminZipFiles,
          ...monthlyZipFiles,
        ]);
      }
    } catch (error) {
      this.logger.error(
        `Error processing job site report for job site ${jobData.jobSiteId}:`,
        error,
      );
      throw error;
    }
  }

  private async processAllJobSites(
    jobSiteIdsToProcess: number[],
    jobData: ReportJobData,
    user: UserEntity,
    isAdminWithMultipleSites: boolean,
  ) {
    const allZipFiles: AttachmentFile[] = [];
    const allReportDataArrays: any[] = [];
    const jobSiteInfoMap = new Map<
      number,
      { clientName: string; jobSiteName: string }
    >();
    const monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] } = {};

    for (const siteId of jobSiteIdsToProcess) {
      const { reportDataArray, siteZipFiles } = await this.processSingleJobSite(
        siteId,
        jobData,
        user,
        isAdminWithMultipleSites,
        jobSiteInfoMap,
        monthlyAttachmentsMap,
      );

      allZipFiles.push(...siteZipFiles);
      allReportDataArrays.push(...reportDataArray);
    }

    const reportMonths = this.extractReportMonths(allReportDataArrays);

    // For admin multi-site reports, `allZipFiles` holds one ZIP per site.
    // Otherwise it is empty and the per-month files live in
    // `monthlyAttachmentsMap` — zipping is deferred to the caller so that
    // link delivery can decide direct-file vs ZIP per month.
    return {
      adminZipFiles: allZipFiles,
      monthlyAttachmentsMap,
      allReportDataArrays,
      reportMonths,
    };
  }

  private async processSingleJobSite(
    siteId: number,
    jobData: ReportJobData,
    user: UserEntity,
    isAdminWithMultipleSites: boolean,
    jobSiteInfoMap: Map<number, { clientName: string; jobSiteName: string }>,
    monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
  ) {
    const siteFormats = jobData.jobSiteFormatsMap?.[siteId] ||
      jobData.formats || [ReportFormatEnum.PDF];

    const { reportDataArray } =
      await this.jobSitesService.generateJobSiteReportData(
        { jobSiteId: siteId, months: jobData.months },
        user,
        jobData.weeklyOverrides,
      );

    this.storeJobSiteInfo(reportDataArray, siteId, jobSiteInfoMap);

    const siteMonthlyAttachmentsMap = isAdminWithMultipleSites
      ? {}
      : monthlyAttachmentsMap;

    await this.processJobSiteFormats(
      reportDataArray,
      siteFormats,
      siteId,
      jobData,
      siteMonthlyAttachmentsMap,
    );

    const siteZipFiles = isAdminWithMultipleSites
      ? await this.createAdminJobSiteZip(
          siteId,
          siteMonthlyAttachmentsMap,
          jobSiteInfoMap,
          jobData,
        )
      : [];

    return { reportDataArray, siteZipFiles };
  }

  private storeJobSiteInfo(
    reportDataArray: any[],
    siteId: number,
    jobSiteInfoMap: Map<number, { clientName: string; jobSiteName: string }>,
  ) {
    if (reportDataArray.length > 0) {
      const jobSite = reportDataArray[0].jobSite;
      if (jobSite?.id) {
        jobSiteInfoMap.set(jobSite.id, {
          clientName: jobSite.clientName || 'Unknown Client',
          jobSiteName: jobSite.title || `Job Site ${jobSite.id}`,
        });
      }
    }
  }

  private async processJobSiteFormats(
    reportDataArray: any[],
    siteFormats: ReportFormatEnum[],
    siteId: number,
    jobData: ReportJobData,
    siteMonthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
  ) {
    const isWeekly = !!jobData.weeklyOverrides?.weekly;

    for (const format of siteFormats) {
      try {
        if (format === ReportFormatEnum.PDF) {
          await this.processJobSitePdfFormat(
            reportDataArray,
            jobData,
            siteMonthlyAttachmentsMap,
          );
          this.logger.log(
            `PDF job-site report generated for job site ${siteId}`,
          );
          void this.reportLogger.log(
            `PDF job-site report generated — job site: ${siteId} | user: ${jobData.user?.email || jobData.user?.id}`,
            'ReportGenerationConsumer',
            {
              jobSiteId: siteId,
              email: jobData.user?.email,
              format: 'PDF',
              reportType: 'job-site',
              weekly: !!jobData.weeklyOverrides?.weekly,
            },
          );
        } else if (
          format === ReportFormatEnum.EXCEL ||
          format === ReportFormatEnum.CSV
        ) {
          // Clients flagged in client_report_config get their own Excel
          // workbook instead of the standard export — cumulative for monthly
          // reports, the same structure scoped to one week for weekly ones.
          if (format === ReportFormatEnum.EXCEL) {
            const clientId = this.getClientIdFromReportData(reportDataArray);
            if (clientId) {
              const usesClientFormat =
                await this.clientReportConfigService.isEnabled(clientId);
              const clientName =
                reportDataArray[0]?.jobSite?.clientName || null;
              if (usesClientFormat) {
                void this.reportLogger.log(
                  `Report sent to ${clientName || clientId} | type: job-site | format: EXCEL | ${isWeekly ? 'weekly' : 'cumulative'} client format: true`,
                  'ReportGenerationConsumer',
                  {
                    clientId,
                    clientName,
                    email: jobData.user?.email || null,
                    jobSiteId: siteId,
                    reportType: 'job-site',
                    format: 'EXCEL',
                    isCumulative: !isWeekly,
                    weekly: isWeekly,
                  },
                );
                await this.processClientFormatExcel(
                  clientId,
                  siteMonthlyAttachmentsMap,
                  jobData,
                  siteId,
                );
                continue;
              }
            }
          }
          void this.reportLogger.log(
            `Report sent | type: job-site | format: ${format.toUpperCase()} | cumulative: false`,
            'ReportGenerationConsumer',
            {
              jobSiteId: siteId,
              email: jobData.user?.email || null,
              reportType: 'job-site',
              format: format.toUpperCase(),
              isCumulative: false,
            },
          );
          await this.processExcelCsvFormat(
            reportDataArray,
            format,
            siteId,
            jobData,
            siteMonthlyAttachmentsMap,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate ${format.toUpperCase()} report for job site ${siteId}:`,
          error,
        );
        void this.reportLogger.error(
          `Failed to generate ${format.toUpperCase()} report for job site ${siteId}: ${error?.message}`,
          'ReportGenerationConsumer',
          { siteId, format, error: error?.message },
        );
      }
    }
  }

  private async processJobSitePdfFormat(
    reportDataArray: any[],
    jobData: ReportJobData,
    siteMonthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
  ) {
    for (const reportData of reportDataArray) {
      const pdfAttachments =
        await this.jobSitesService.exportJobSiteReportToPdf(
          reportData,
          jobData.useJobSiteNameInFilename || false,
          jobData.isAdmin || false,
          undefined,
          jobData.weeklyOverrides,
        );

      const monthName = this.getMonthName(jobData.weeklyOverrides, reportData);

      if (!siteMonthlyAttachmentsMap[monthName]) {
        siteMonthlyAttachmentsMap[monthName] = [];
      }

      pdfAttachments.forEach((attachment) => {
        siteMonthlyAttachmentsMap[monthName].push({
          ...attachment,
          format: ReportFormatEnum.PDF,
        });
      });
    }
  }

  private async createAdminJobSiteZip(
    siteId: number,
    siteMonthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
    jobSiteInfoMap: Map<number, { clientName: string; jobSiteName: string }>,
    jobData: ReportJobData,
  ): Promise<AttachmentFile[]> {
    const monthlyAttachments = this.convertToMonthlyAttachments(
      siteMonthlyAttachmentsMap,
    );

    if (monthlyAttachments.length === 0) {
      return [];
    }

    const jobSiteInfo = jobSiteInfoMap.get(siteId);
    const zipFileName = jobSiteInfo
      ? `${jobSiteInfo.clientName} - ${jobSiteInfo.jobSiteName}.zip`
      : `JobSite_${siteId}.zip`;

    const allAttachmentsForSite = monthlyAttachments.flatMap(
      (m) => m.attachments,
    );

    const zipFile = await createZipFromAttachments(
      allAttachmentsForSite,
      zipFileName,
      process.cwd(),
      jobData.delivery !== 'download',
    );

    return [zipFile];
  }

  private async createMonthlyZipFilesForJobSite(
    monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
    jobData: ReportJobData,
  ): Promise<AttachmentFile[]> {
    const monthlyAttachments = this.convertToMonthlyAttachments(
      monthlyAttachmentsMap,
    );

    return createMonthlyZipFiles(
      monthlyAttachments,
      'job-site',
      jobData.jobSiteId,
      process.cwd(),
      jobData.delivery !== 'download',
    );
  }

  private convertToMonthlyAttachments(attachmentsMap: {
    [monthName: string]: AttachmentFile[];
  }): MonthlyAttachments[] {
    return Object.entries(attachmentsMap).map(([monthName, attachments]) => ({
      monthName,
      attachments,
    }));
  }

  private async sendJobSiteMonthlyReportEmail(
    user: UserEntity,
    jobData: ReportJobData,
    jobSiteIdsToProcess: number[],
    reportDataArray: any[],
    reportMonths: string[],
    downloadLinks?: ReportDownloadLink[],
  ) {
    if (jobData.cron) {
      if (jobData.isAdmin && jobSiteIdsToProcess.length > 1) {
        await this.sendAdminConsolidatedEmail(
          user,
          jobData,
          reportDataArray,
          reportMonths,
          downloadLinks,
        );
      } else {
        await this.sendIndividualJobSiteEmail(
          user,
          jobData,
          reportMonths,
          downloadLinks,
        );
      }
    } else {
      await this.sendArchiveJobSiteEmail(
        user,
        reportDataArray,
        reportMonths,
        downloadLinks,
        jobData.reportCcEmails,
      );
    }
  }

  private async sendAdminConsolidatedEmail(
    user: UserEntity,
    jobData: ReportJobData,
    reportDataArray: any[],
    reportMonths: string[],
    downloadLinks?: ReportDownloadLink[],
  ) {
    const clientJobSiteList = this.buildClientJobSiteList(reportDataArray);

    await this.mailService.sendMonthlyReportAdminEmail({
      to: user.email!,
      cc: jobData.reportCcEmails,
      data: {
        name: user.name || 'Admin',
        clientJobSiteList,
        reportMonth: reportMonths[0],
        downloadLinks,
        frequency: jobData.weeklyOverrides?.weekly ? 'weekly' : 'monthly',
        weekly: jobData.weeklyOverrides?.weekly,
        started: jobData.weeklyOverrides?.startDate,
        ended: jobData.weeklyOverrides?.endDate,
      },
    });
  }

  private buildClientJobSiteList(reportDataArray: any[]): string {
    const jobSiteMap = new Map<string, string>();

    for (const reportData of reportDataArray) {
      const { jobSite } = reportData;
      if (jobSite?.id && jobSite?.clientName && jobSite?.title) {
        const key = `${jobSite.id}`;
        if (!jobSiteMap.has(key)) {
          jobSiteMap.set(
            key,
            `<b>${jobSite.clientName}</b> - ${jobSite.title}`,
          );
        }
      }
    }

    return Array.from(jobSiteMap.values()).join('<br/>') + '<br/>';
  }

  private async sendIndividualJobSiteEmail(
    user: UserEntity,
    jobData: ReportJobData,
    reportMonths: string[],
    downloadLinks?: ReportDownloadLink[],
  ) {
    const jobSite = await this.jobSitesService.findOne(
      { id: jobData.jobSiteId! },
      user,
    );

    await this.mailService.sendMonthlyReportEmail({
      to: user.email!,
      cc: jobData.reportCcEmails,
      data: {
        name: user.name || 'User',
        jobSiteName: jobSite?.title || 'Job Site',
        reportMonth: reportMonths[0],
        downloadLinks,
        jobSiteId: jobData.jobSiteId,
        frequency: jobData.weeklyOverrides?.weekly ? 'weekly' : 'monthly',
        weekly: jobData.weeklyOverrides?.weekly,
        started: jobData.weeklyOverrides?.startDate,
        ended: jobData.weeklyOverrides?.endDate,
      },
    });
  }

  private async sendArchiveJobSiteEmail(
    user: UserEntity,
    reportDataArray: any[],
    reportMonths: string[],
    downloadLinks?: ReportDownloadLink[],
    reportCcEmails?: string[],
  ) {
    const { jobSite } = reportDataArray[0];

    await this.mailService.archiveReportsEmail({
      to: user.email!,
      cc: reportCcEmails,
      data: {
        name: user?.name || 'User',
        jobSiteName: jobSite?.title || 'Job Site',
        reportMonths,
        downloadLinks,
      },
    });
  }

  private async createJobSiteMonthlyDownloadZip(allZipFiles: AttachmentFile[]) {
    const finalizedZips = this.filterValidZipFiles(allZipFiles);

    if (finalizedZips.length === 0) {
      throw new Error('Zip files not finalized or empty for job-site export.');
    }

    const outerZipName =
      finalizedZips.length > 1
        ? 'job-site-archive.zip'
        : `${finalizedZips[0].filename.replace(/\.zip$/, '')}-archive.zip`;

    const outerZipPath = path.join(process.cwd(), outerZipName);

    await this.createOuterZipFile(outerZipPath, finalizedZips);

    await safeDeleteAttachments(finalizedZips);
    this.logger.log(
      `Deleted ${finalizedZips.length} zip files after creating outer zip for job site download`,
    );

    return {
      zip: { filename: outerZipName, path: outerZipPath },
      artifacts: finalizedZips.map((z) => z.path).filter(Boolean),
    } as any;
  }

  private filterValidZipFiles(zipFiles: AttachmentFile[]): AttachmentFile[] {
    return zipFiles.filter((z) => {
      try {
        return z.path && fs.existsSync(z.path) && fs.statSync(z.path).size > 0;
      } catch {
        return false;
      }
    });
  }

  private async createOuterZipFile(
    zipPath: string,
    innerZips: AttachmentFile[],
  ) {
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.pipe(output);

      for (const inner of innerZips) {
        if (inner.path && fs.existsSync(inner.path)) {
          archive.file(inner.path, {
            name: inner.filename,
            store: true,
          });
        }
      }

      archive.finalize();
    });
  }

  private logJobSiteReportCompletion(
    user: UserEntity,
    jobSiteIdsToProcess: number[],
    jobData: ReportJobData,
    attachments?: AttachmentFile[],
  ) {
    const jobSitesCount = jobSiteIdsToProcess.length;
    const jobSitesInfo =
      jobSitesCount > 1
        ? `${jobSitesCount} job sites`
        : `job site ${jobData.jobSiteId}`;
    const attachmentInfo = attachments
      ? this.summarizeAttachments(attachments)
      : null;
    const attachmentSuffix = attachmentInfo
      ? ` | attachments: ${attachmentInfo.count} (${attachmentInfo.totalKb}KB)`
      : '';
    this.logger.log(
      `Job site report sent to ${user.email} for ${jobSitesInfo}${attachmentSuffix}`,
    );
    void this.reportLogger.log(
      `Email sent to ${user.email} — job-site report for ${jobSitesInfo}${attachmentSuffix}`,
      'ReportGenerationConsumer',
      {
        email: user.email,
        jobSiteIds: jobSiteIdsToProcess,
        weekly: !!jobData.weeklyOverrides?.weekly,
        attachmentCount: attachmentInfo?.count,
        attachmentTotalKb: attachmentInfo?.totalKb,
        attachmentFiles: attachmentInfo?.filenames,
      },
    );
  }

  private summarizeAttachments(attachments: AttachmentFile[]) {
    let totalBytes = 0;
    const filenames: string[] = [];
    for (const att of attachments) {
      try {
        if (att.path && fs.existsSync(att.path)) {
          totalBytes += fs.statSync(att.path).size;
        }
      } catch {
        // ignore size lookup failures — keep going
      }
      if (att.filename) filenames.push(att.filename);
    }
    return {
      count: attachments.length,
      totalKb: Math.round(totalBytes / 1024),
      filenames,
    };
  }

  private async processDashboardReport(jobData: ReportJobData) {
    try {
      if (jobData.startDate && jobData.endDate) {
        return await this.processDashboardRangeReport(jobData);
      }
      return await this.processDashboardMonthlyReport(jobData);
    } catch (error) {
      this.logger.error(
        `Error processing dashboard report for user ${jobData.user?.id}:`,
        error,
      );
      throw error;
    }
  }

  private async processDashboardRangeReport(jobData: ReportJobData) {
    const user = await this.validateAndFetchUser(jobData.user.id);

    const { reportData } =
      await this.homeService.generateDashboardReportDataForRange(
        jobData.startDate!,
        jobData.endDate!,
        user,
        {
          wasteType: jobData.wasteType,
          materialDestinationType: jobData.materialDestinationType,
          materialDestinations: jobData.materialDestinations,
        },
      );

    const rangeMonths = getDateRangeMonths(
      jobData.startDate!,
      jobData.endDate!,
    );

    const monthReportDataList = await this.generateDashboardMonthReportDataList(
      rangeMonths,
      reportData,
    );

    const attachments = await this.generateDashboardAttachments(
      reportData,
      rangeMonths,
      monthReportDataList,
      jobData,
      user,
    );

    if (attachments.length === 0) {
      throw new Error('No artifacts generated for range dashboard report');
    }

    if (jobData.delivery !== 'download') {
      await this.sendDashboardRangeReportEmail(user, jobData, attachments);
      await safeDeleteAttachments(attachments);
      this.logger.log(
        `Deleted ${attachments.length} artifact files after email for dashboard range report`,
      );
    }

    if (jobData.delivery && jobData.delivery !== 'email') {
      return await this.createDashboardRangeDownloadZip(jobData, attachments);
    }

    return;
  }

  private async processDashboardMonthlyReport(jobData: ReportJobData) {
    if (!jobData.user || typeof jobData.user.id === 'undefined') {
      throw new Error('Missing user context for dashboard report job');
    }

    const user = await this.validateAndFetchUser(jobData.user.id);

    const { reportDataArray } =
      await this.homeService.generateDashboardReportData(
        { months: jobData.months },
        user,
        jobData.weeklyOverrides,
        {
          wasteType: jobData.wasteType,
          materialDestinationType: jobData.materialDestinationType,
          materialDestinations: jobData.materialDestinations,
        },
      );

    const reportMonths = this.extractReportMonths(reportDataArray);
    const monthlyAttachmentsMap = await this.processDashboardFormats(
      reportDataArray,
      jobData,
      user,
    );

    const allAttachments = Object.values(monthlyAttachmentsMap).flat();

    if (allAttachments.length === 0) {
      throw new Error(
        'Dashboard report generation produced no files for any requested format.',
      );
    }

    if (jobData.delivery !== 'download') {
      const effectiveExtension = this.getEffectiveExtension(jobData);

      // All reports are delivered as download links (never attachments): each
      // generated file becomes its own link (a dashboard PDF export is itself a
      // .zip, so we never bundle a wrapper archive around it).
      const emailFiles = this.buildMonthlyLinkDeliverables(
        monthlyAttachmentsMap,
        jobData.weeklyOverrides,
      );

      // Upload every file to S3 and email the download links. PIZ clients
      // additionally get a .piz link for each .zip archive.
      const downloadLinks = await this.uploadArchivesForLinkDelivery(
        emailFiles,
        effectiveExtension,
      );

      await this.sendDashboardMonthlyReportEmail(
        user,
        jobData,
        reportDataArray,
        reportMonths,
        downloadLinks,
      );
      await safeDeleteAttachments(emailFiles);
      this.logger.log(
        `Deleted ${emailFiles.length} artifact files after email for dashboard monthly report`,
      );
    }

    if (jobData.delivery && jobData.delivery !== 'email') {
      return await this.createDashboardMonthlyDownloadZip(
        jobData,
        monthlyAttachmentsMap,
        allAttachments,
      );
    }
  }

  private async generateDashboardMonthReportDataList(
    rangeMonths: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
    reportData: any,
  ): Promise<any[] | undefined> {
    if (!rangeMonths || rangeMonths.length === 0) {
      return undefined;
    }

    const userForMonth = reportData.user
      ? reportData.user
      : {
          id: reportData.user?.id,
          role: { id: reportData.role },
        };

    return Promise.all(
      rangeMonths.map(async (monthPlan) => {
        const monthData = await this.homeService.getDashboardReportMonthsData(
          monthPlan,
          userForMonth,
        );
        return {
          wasteStreamDataByMonth: monthData.wasteStreamDataByMonth || [],
          ...(monthData.clients && { clients: monthData.clients }),
          ...(monthData.clientIds && { clientIds: monthData.clientIds }),
          ...(monthData.jobSites && { jobSites: monthData.jobSites }),
          ...(monthData.jobsiteIds && { jobsiteIds: monthData.jobsiteIds }),
        };
      }),
    );
  }

  private async generateDashboardAttachments(
    reportData: any,
    rangeMonths: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
    monthReportDataList: any[] | undefined,
    jobData: ReportJobData,
    user: UserEntity,
  ): Promise<AttachmentFile[]> {
    const formats = jobData.formats || [ReportFormatEnum.PDF];
    const attachments: AttachmentFile[] = [];

    for (const format of formats) {
      if (format === ReportFormatEnum.PDF) {
        const pdfs = await this.homeService.exportDashboardReportToPdf(
          reportData,
          rangeMonths,
          jobData.delivery !== 'download',
          jobData.delivery === 'download',
          monthReportDataList,
          user,
        );
        attachments.push(...pdfs);
      } else {
        // Check cumulative for Excel in range dashboard reports
        if (format === ReportFormatEnum.EXCEL) {
          const clientId = Number(jobData.user?.id);
          if (clientId) {
            const isCumulative =
              await this.clientReportConfigService.isEnabled(clientId);
            if (isCumulative) {
              this.logger.log(
                `Client ${clientId} has cumulative reporting enabled, generating cumulative Excel for dashboard range`,
              );
              const cumulativeResult =
                await this.generateCumulativeAttachment(clientId);
              attachments.push(cumulativeResult);
              continue;
            }
          }
        }
        const result = await this.exportDashboardFormat(
          reportData,
          format,
          rangeMonths,
          monthReportDataList,
          jobData,
        );
        attachments.push(...(Array.isArray(result) ? result : [result]));
      }
    }

    return attachments;
  }

  private async exportDashboardFormat(
    reportData: any,
    format: ReportFormatEnum,
    rangeMonths:
      | Array<{ monthName: string; startDate: string; endDate: string }>
      | undefined,
    monthReportDataList: any[] | undefined,
    jobData: ReportJobData,
  ) {
    const monthName = `${jobData.startDate}_${jobData.endDate}`;

    if (rangeMonths && rangeMonths.length > 0) {
      return this.exportFormatsService.exportReport(
        {
          ...reportData,
          monthReportDataList,
        },
        format,
        process.cwd(),
        'dashboard',
        monthName,
        undefined,
        rangeMonths,
      );
    }

    return this.exportFormatsService.exportReport(
      reportData,
      format,
      process.cwd(),
      'dashboard',
      monthName,
      undefined,
    );
  }

  private async sendDashboardRangeReportEmail(
    user: UserEntity,
    jobData: ReportJobData,
    attachments: AttachmentFile[],
  ) {
    // Deliver the range report as download links (never attachments), using the
    // client's compression setting: a ZIP client gets one .zip link per file, a
    // PIZ client also gets a .piz link for each .zip archive.
    const reportDate = `${jobData.startDate}-${jobData.endDate}`;
    const deliverables = this.decorateLinkDeliverables(attachments, reportDate);
    const downloadLinks = await this.uploadArchivesForLinkDelivery(
      deliverables,
      this.getEffectiveExtension(jobData),
    );

    await this.mailService.sendDashboardReportUserEmail({
      to: user.email!,
      cc: jobData.reportCcEmails,
      data: {
        name: user.name || 'User',
        company: user?.company || null,
        jobSiteList: '',
        reportMonths: [`${jobData.startDate} to ${jobData.endDate}`],
        downloadLinks,
        frequency: jobData.weeklyOverrides?.weekly ? 'weekly' : 'monthly',
        weekly: jobData.weeklyOverrides?.weekly,
        started: jobData.startDate,
        ended: jobData.endDate,
      },
    });
  }

  private async createDashboardRangeDownloadZip(
    jobData: ReportJobData,
    attachments: AttachmentFile[],
  ) {
    const pdfAttachment = attachments.find((a) =>
      a.path.includes('dashboard_'),
    );

    if (pdfAttachment && fs.existsSync(pdfAttachment.path)) {
      const stat = fs.statSync(pdfAttachment.path);
      if (stat.isDirectory()) {
        return await this.createFolderBasedZip(
          pdfAttachment.path,
          attachments,
          jobData,
        );
      }
    }

    return await this.createSimpleDashboardZip(jobData, attachments);
  }

  private async createFolderBasedZip(
    folderPath: string,
    attachments: AttachmentFile[],
    jobData: ReportJobData,
  ) {
    const otherAttachments = attachments.filter((a) => a.path !== folderPath);
    const outerZipName = `dashboard_${jobData.startDate}_${jobData.endDate}.zip`;
    const zipPath = path.join(process.cwd(), outerZipName);

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      let resolved = false;

      output.on('close', () => {
        if (!resolved) {
          resolved = true;
          if (!fs.existsSync(zipPath)) {
            reject(new Error('ZIP file was not created'));
            return;
          }
          const stat = fs.statSync(zipPath);
          if (stat.size === 0) {
            reject(new Error('ZIP file is empty'));
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
      archive.directory(folderPath, path.basename(folderPath));

      for (const attachment of otherAttachments) {
        if (fs.existsSync(attachment.path)) {
          archive.file(attachment.path, {
            name: attachment.filename || path.basename(attachment.path),
          });
        }
      }

      archive.finalize();
    });

    return {
      zip: { filename: outerZipName, path: zipPath },
      artifacts: [folderPath, ...otherAttachments.map((a) => a.path)],
    } as any;
  }

  private async createSimpleDashboardZip(
    jobData: ReportJobData,
    attachments: AttachmentFile[],
  ) {
    const outerZipName = `dashboard_${jobData.startDate}_${jobData.endDate}.zip`;
    const [zipFile] = await createMonthlyZipFiles(
      [{ monthName: outerZipName.replace(/\.zip$/, ''), attachments }],
      'dashboard',
      undefined,
      process.cwd(),
      false,
    );
    return {
      zip: zipFile,
      artifacts: attachments.map((a) => a.path),
    } as any;
  }

  private extractReportMonths(reportDataArray: any[]): string[] {
    const allPlans = reportDataArray.flatMap(
      (reportData: any) => reportData.plans || [],
    );
    return allPlans.map((p: any) => p.monthName);
  }

  private async processDashboardFormats(
    reportDataArray: any[],
    jobData: ReportJobData,
    user: UserEntity,
  ): Promise<{ [monthName: string]: AttachmentFile[] }> {
    const formats = jobData.formats || [ReportFormatEnum.PDF];
    const monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] } = {};
    const isWeekly = !!jobData.weeklyOverrides?.weekly;

    for (const format of formats) {
      try {
        if (format === ReportFormatEnum.PDF) {
          await this.processDashboardPdfFormat(
            reportDataArray,
            jobData,
            user,
            monthlyAttachmentsMap,
          );
          this.logger.log(`PDF dashboard report generated successfully`);
          void this.reportLogger.log(
            `PDF dashboard report generated — user: ${jobData.user?.email || jobData.user?.id}`,
            'ReportGenerationConsumer',
            {
              email: jobData.user?.email,
              userId: jobData.user?.id,
              format: 'PDF',
              reportType: 'dashboard',
            },
          );
        } else if (
          format === ReportFormatEnum.EXCEL ||
          format === ReportFormatEnum.CSV
        ) {
          // Clients flagged in client_report_config get their own Excel
          // workbook instead of the standard export — cumulative for monthly
          // reports, the same structure scoped to one week for weekly ones.
          if (format === ReportFormatEnum.EXCEL) {
            const clientId = Number(jobData.user?.id);
            if (clientId) {
              const usesClientFormat =
                await this.clientReportConfigService.isEnabled(clientId);
              const clientName =
                jobData.user?.name || jobData.user?.company || null;
              if (usesClientFormat) {
                void this.reportLogger.log(
                  `Report sent to ${clientName || clientId} | type: dashboard | format: EXCEL | ${isWeekly ? 'weekly' : 'cumulative'} client format: true`,
                  'ReportGenerationConsumer',
                  {
                    clientId,
                    clientName,
                    email: jobData.user?.email || null,
                    reportType: 'dashboard',
                    format: 'EXCEL',
                    isCumulative: !isWeekly,
                    weekly: isWeekly,
                  },
                );
                await this.processClientFormatExcel(
                  clientId,
                  monthlyAttachmentsMap,
                  jobData,
                );
                continue;
              }
            }
          }
          void this.reportLogger.log(
            `Report sent | type: dashboard | format: ${format.toUpperCase()} | cumulative: false`,
            'ReportGenerationConsumer',
            {
              userId: jobData.user?.id,
              email: jobData.user?.email || null,
              reportType: 'dashboard',
              format: format.toUpperCase(),
              isCumulative: false,
            },
          );
          await this.processExcelCsvFormatDashboard(
            reportDataArray,
            format,
            jobData,
            monthlyAttachmentsMap,
          );
          this.logger.log(
            `${format.toUpperCase()} dashboard report generated successfully`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate ${format.toUpperCase()} dashboard report:`,
          error,
        );
        void this.reportLogger.error(
          `Failed to generate ${format.toUpperCase()} dashboard report: ${error?.message}`,
          'ReportGenerationConsumer',
          {
            format,
            userId: jobData.user?.id,
            email: jobData.user?.email,
            error: error?.message,
          },
        );
      }
    }

    return monthlyAttachmentsMap;
  }

  private async processDashboardPdfFormat(
    reportDataArray: any[],
    jobData: ReportJobData,
    user: UserEntity,
    monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
  ) {
    for (const reportData of reportDataArray) {
      await this.enrichReportDataWithMonthsDataIfNeeded(reportData, user);

      const rangeMonthsForPdf = this.buildRangeMonthsFromPlans(reportData);

      const pdfAttachments = await this.homeService.exportDashboardReportToPdf(
        reportData,
        rangeMonthsForPdf,
        jobData.delivery !== 'download',
        jobData.delivery === 'download',
        undefined,
        user,
        jobData.weeklyOverrides,
      );

      const monthName = this.getMonthName(jobData.weeklyOverrides, reportData);
      if (!monthlyAttachmentsMap[monthName]) {
        monthlyAttachmentsMap[monthName] = [];
      }
      pdfAttachments.forEach((attachment) => {
        monthlyAttachmentsMap[monthName].push({
          ...attachment,
          format: ReportFormatEnum.PDF,
        });
      });
    }
  }

  private async enrichReportDataWithMonthsDataIfNeeded(
    reportData: any,
    user: UserEntity,
  ) {
    if (!reportData.hasMonthsData && reportData.plans?.length > 0) {
      const plan = reportData.plans[0];
      const monthsData = await this.homeService.getDashboardReportMonthsData(
        plan,
        user,
      );
      Object.assign(reportData, {
        hasMonthsData: monthsData.hasMonthsData,
        wasteStreamDataByMonth: monthsData.wasteStreamDataByMonth,
        ...(monthsData.clients && { clients: monthsData.clients }),
        ...(monthsData.clientIds && { clientIds: monthsData.clientIds }),
        ...(monthsData.jobSites && { jobSites: monthsData.jobSites }),
        ...(monthsData.jobsiteIds && { jobsiteIds: monthsData.jobsiteIds }),
      });
    }
  }

  private buildRangeMonthsFromPlans(reportData: any) {
    if (!reportData.plans || reportData.plans.length === 0) {
      return undefined;
    }
    return reportData.plans.map((plan: any) => ({
      monthName: plan.monthName || plan.month,
      startDate: plan.startDate || reportData.startDate,
      endDate: plan.endDate || reportData.endDate,
    }));
  }

  private async sendDashboardMonthlyReportEmail(
    user: UserEntity,
    jobData: ReportJobData,
    reportDataArray: any[],
    reportMonths: string[],
    downloadLinks?: ReportDownloadLink[],
  ) {
    const linkCount = downloadLinks?.length ?? 0;
    this.logger.log(
      `Sending dashboard report with ${linkCount} download link(s)`,
    );

    if (jobData.cron) {
      if (jobData.isAdmin) {
        await this.mailService.sendDashboardReportAdminEmail({
          to: user.email!,
          cc: jobData.reportCcEmails,
          data: {
            name: user.name || 'Admin',
            reportMonths,
            downloadLinks,
            frequency: jobData.weeklyOverrides?.weekly ? 'weekly' : 'monthly',
            weekly: jobData.weeklyOverrides?.weekly,
            started: jobData.weeklyOverrides?.startDate,
            ended: jobData.weeklyOverrides?.endDate,
          },
        });
      } else {
        // `jobSites` is only populated when the PDF/enrich step ran, and `plans`
        // may be absent for some report shapes — guard both so a non-admin
        // dashboard email never crashes on `.map` (the admin branch above uses
        // the pre-computed `reportMonths` and is unaffected).
        const { jobSites, plans } = reportDataArray[0] ?? {};
        const jobSiteList = this.buildJobSiteList(jobSites);
        const reportMonthsFromPlans = plans?.length
          ? plans.map((p: any) => p.monthName)
          : reportMonths;

        await this.mailService.sendDashboardReportUserEmail({
          to: user.email!,
          cc: jobData.reportCcEmails,
          data: {
            name: user.name || 'User',
            company: user?.company || null,
            jobSiteList,
            reportMonths: reportMonthsFromPlans,
            downloadLinks,
            frequency: jobData.weeklyOverrides?.weekly ? 'weekly' : 'monthly',
            weekly: jobData.weeklyOverrides?.weekly,
            started: jobData.weeklyOverrides?.startDate,
            ended: jobData.weeklyOverrides?.endDate,
          },
        });
      }
    } else {
      await this.mailService.archiveDashboardReportsEmail({
        to: user.email!,
        cc: jobData.reportCcEmails,
        data: {
          name: user.name || 'User',
          reportMonths,
          downloadLinks,
        },
      });
    }

    this.logger.log(
      `Dashboard report sent to ${user.email} | download links: ${linkCount}`,
    );
    void this.reportLogger.log(
      `Email sent to ${user.email} — dashboard report | download links: ${linkCount}`,
      'ReportGenerationConsumer',
      {
        email: user.email,
        userId: user.id,
        weekly: !!jobData.weeklyOverrides?.weekly,
        isAdmin: jobData.isAdmin,
        reportMonths,
        downloadLinkCount: linkCount,
        downloadLinks: downloadLinks?.map((l) => l.filename),
      },
    );
  }

  private buildJobSiteList(jobSites?: any[]): string {
    return (jobSites ?? [])
      .map((jobSite) => {
        const statusIndicator =
          jobSite?.status?.id === StatusEnum.inactive ? ' (Closed)' : '';
        return `${jobSite.title}${statusIndicator}<br/>`;
      })
      .join('');
  }

  private async createDashboardMonthlyDownloadZip(
    jobData: ReportJobData,
    monthlyAttachmentsMap: { [monthName: string]: AttachmentFile[] },
    allAttachments: AttachmentFile[],
  ) {
    const existingAttachments = allAttachments.filter(
      (a) => a.path && fs.existsSync(a.path),
    );

    if (existingAttachments.length === 0) {
      throw new Error(
        'No downloadable artifacts were produced on disk for dashboard export.',
      );
    }

    const zipName =
      jobData.months && jobData.months.length > 1
        ? 'dashboard-archive.zip'
        : `${Object.keys(monthlyAttachmentsMap)[0] || 'report'}.zip`;

    const [zipFile] = await createMonthlyZipFiles(
      [
        {
          monthName: zipName.replace(/\.zip$/, ''),
          attachments: existingAttachments,
        },
      ],
      'dashboard',
      undefined,
      process.cwd(),
      false,
    );

    return {
      zip: zipFile,
      artifacts: existingAttachments.map((a) => a.path),
    } as any;
  }

  private shouldFilterWasteStreamsForFormat(
    jobData: ReportJobData,
    format: ReportFormatEnum,
  ): boolean {
    return !jobData.isAdmin && format !== ReportFormatEnum.PDF;
  }

  private cloneAndFilterReportData(reportData: any) {
    const cloned = this.deepCloneReportData(reportData);
    this.applyWasteStreamFilterToReportData(cloned);
    return cloned;
  }

  private deepCloneReportData(reportData: any) {
    return JSON.parse(JSON.stringify(reportData));
  }

  private applyWasteStreamFilterToReportData(reportData: any) {
    if (!reportData) return;

    if (reportData.barGraph) {
      this.filterBarGraphWasteStreams(reportData.barGraph);
    }

    if (reportData.monthGraph?.data) {
      this.filterBarGraphWasteStreams(reportData.monthGraph.data);
    }

    if (reportData.monthsGraph?.dataByMonth) {
      Object.keys(reportData.monthsGraph.dataByMonth).forEach((label) => {
        this.filterBarGraphWasteStreams(
          reportData.monthsGraph.dataByMonth[label],
        );
      });
    }

    if (Array.isArray(reportData.monthReportDataList)) {
      reportData.monthReportDataList.forEach((monthData) =>
        this.applyWasteStreamFilterToReportData(monthData),
      );
    }
  }

  private filterBarGraphWasteStreams(barGraph: any) {
    if (!barGraph || !Array.isArray(barGraph.jobSitesWasteStreams)) {
      return;
    }

    barGraph.jobSitesWasteStreams = barGraph.jobSitesWasteStreams.filter(
      (stream: any) =>
        Array.isArray(stream.jobSitesWasteStreamsDumpsters) &&
        stream.jobSitesWasteStreamsDumpsters.length > 0,
    );

    this.recalculateBarGraphTotals(barGraph);
  }

  private recalculateBarGraphTotals(barGraph: any) {
    const totals = (barGraph.jobSitesWasteStreams || []).reduce(
      (
        acc: { totalTons: number; totalMoved: number; totalDiverted: number },
        stream: any,
      ) => {
        acc.totalTons += Number(stream.tons || 0);
        acc.totalMoved += Number(stream.moved || 0);
        acc.totalDiverted += Number(stream.diverted_tons || 0);
        return acc;
      },
      { totalTons: 0, totalMoved: 0, totalDiverted: 0 },
    );

    barGraph.total_tons = Number(totals.totalTons.toFixed(2));
    barGraph.total_moved = totals.totalMoved;
    barGraph.tons_diverted = Number(totals.totalDiverted.toFixed(2));
    barGraph.waste_diversion =
      totals.totalTons === 0
        ? 0
        : Number(((totals.totalDiverted / totals.totalTons) * 100).toFixed(2));
  }

  /**
   * Generate a single cumulative Excel attachment for a client
   */
  private async generateCumulativeAttachment(
    clientId: number,
    jobSiteId?: number,
  ): Promise<AttachmentFile> {
    const now = new Date();
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    const outputPath = process.cwd();

    const result = await this.clientExcelReportService.generateCumulativeExcel(
      clientId,
      previousMonthEnd,
      outputPath,
      jobSiteId,
    );

    this.logger.log(
      `Cumulative Excel report generated: ${result.filename} for client ${clientId}`,
    );

    return {
      filename: result.filename,
      path: result.path,
      format: ReportFormatEnum.EXCEL,
    };
  }

  /**
   * Extract clientId from report data array (job-site reports)
   */
  private getClientIdFromReportData(reportDataArray: any[]): number | null {
    if (reportDataArray.length === 0) return null;
    const jobSite = reportDataArray[0]?.jobSite;
    if (!jobSite) return null;
    const clientId = jobSite.clientId || jobSite.client?.id;
    return clientId ? Number(clientId) : null;
  }

  /**
   * The Monday-to-Sunday window a weekly report covers, or null when the job is
   * not a weekly run or is missing either end of the range. Returning null makes
   * the caller fall back to the cumulative workbook rather than invent a period.
   */
  private resolveWeeklyPeriod(
    jobData: ReportJobData,
  ): { weekStart: Date; weekEnd: Date } | null {
    const { weekly, startDate, endDate } = jobData.weeklyOverrides ?? {};
    if (!weekly || !startDate || !endDate) return null;
    // parseISO reads a bare yyyy-MM-dd as local midnight, matching the
    // server-local reasoning the weekly cron already uses.
    return {
      weekStart: startOfDay(parseISO(startDate)),
      weekEnd: endOfDay(parseISO(endDate)),
    };
  }

  /**
   * Generate the client-format Excel workbook for a client and add it as an
   * attachment.
   *
   * Weekly runs get a workbook holding only that Monday-to-Sunday period; every
   * other run gets the cumulative workbook through the end of last month. The
   * two are bucketed under different keys because the "Cumulative" wording in
   * the download-link label is derived from the key alone — see
   * `buildFileLinkLabel`.
   */
  private async processClientFormatExcel(
    clientId: number,
    attachmentsMap: { [monthName: string]: AttachmentFile[] },
    jobData: ReportJobData,
    jobSiteId?: number,
  ): Promise<void> {
    const now = new Date();
    const outputPath = process.cwd();
    const weeklyPeriod = this.resolveWeeklyPeriod(jobData);

    const result = weeklyPeriod
      ? await this.clientExcelReportService.generateWeeklyExcel(
          clientId,
          weeklyPeriod.weekStart,
          weeklyPeriod.weekEnd,
          outputPath,
          jobSiteId,
        )
      : await this.clientExcelReportService.generateCumulativeExcel(
          clientId,
          endOfMonth(subMonths(now, 1)),
          outputPath,
          jobSiteId,
        );

    void this.reportLogger.log(
      `${weeklyPeriod ? 'Weekly' : 'Cumulative'} client-format Excel file generated: ${result.filename}`,
      'ReportGenerationConsumer',
      {
        clientId,
        filename: result.filename,
        path: result.path,
        weekly: !!weeklyPeriod,
      },
    );

    // A weekly workbook is bucketed as "<start>_<end>-client-weekly" and a
    // cumulative one as "<date>-cumulative" (e.g. 2026-06-12-cumulative), both
    // distinguishable from standard monthly report zips.
    const bucketKey = weeklyPeriod
      ? `${jobData.weeklyOverrides!.startDate}_${jobData.weeklyOverrides!.endDate}-client-weekly`
      : `${format(now, 'yyyy-MM-dd')}-cumulative`;
    if (!attachmentsMap[bucketKey]) {
      attachmentsMap[bucketKey] = [];
    }

    attachmentsMap[bucketKey].push({
      filename: result.filename,
      path: result.path,
      format: ReportFormatEnum.EXCEL,
    });
  }
}
